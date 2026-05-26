using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var jwtKey = builder.Configuration["Jwt:Key"] ?? "CHANGE_ME_DEV_SECRET_CHANGE_ME_DEV_SECRET";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "Lexsutra";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "Lexsutra";
var googleClientId = builder.Configuration["Google:ClientId"] ?? string.Empty;

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:5173" };
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

var connectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=lexsutra.db";
var adminKey = builder.Configuration["Admin:Key"] ?? string.Empty;

await EnsureDatabaseAsync(connectionString);

var passwordHasher = new PasswordHasher<UserForHashing>();

app.MapPost("/api/auth/signup", async (SignupDto dto) =>
{
    var email = (dto.email ?? string.Empty).Trim().ToLowerInvariant();
    var password = dto.password ?? string.Empty;
    var name = string.IsNullOrWhiteSpace(dto.name) ? null : dto.name.Trim();

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
    {
        return Results.BadRequest(new { message = "Email and password are required." });
    }

    if (password.Length < 6)
    {
        return Results.BadRequest(new { message = "Password must be at least 6 characters." });
    }

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var existsCmd = conn.CreateCommand();
    existsCmd.CommandText = "SELECT Id FROM Users WHERE Email = $email LIMIT 1;";
    existsCmd.Parameters.AddWithValue("$email", email);
    var existing = await existsCmd.ExecuteScalarAsync();
    if (existing is not null)
    {
        return Results.Conflict(new { message = "Email already exists." });
    }

    var hash = passwordHasher.HashPassword(new UserForHashing(), password);
    var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);

    var insertCmd = conn.CreateCommand();
    insertCmd.CommandText = @"INSERT INTO Users (Email, PasswordHash, GoogleSub, Name, CreatedAt, UpdatedAt)
VALUES ($email, $passwordHash, NULL, $name, $createdAt, $updatedAt);";
    insertCmd.Parameters.AddWithValue("$email", email);
    insertCmd.Parameters.AddWithValue("$passwordHash", hash);
    insertCmd.Parameters.AddWithValue("$name", (object?)name ?? DBNull.Value);
    insertCmd.Parameters.AddWithValue("$createdAt", now);
    insertCmd.Parameters.AddWithValue("$updatedAt", now);

    try
    {
        await insertCmd.ExecuteNonQueryAsync();
    }
    catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
    {
        return Results.Conflict(new { message = "Email already exists." });
    }

    var lastIdCmd = conn.CreateCommand();
    lastIdCmd.CommandText = "SELECT last_insert_rowid();";
    var userId = Convert.ToInt64(await lastIdCmd.ExecuteScalarAsync() ?? 0, CultureInfo.InvariantCulture);
    var user = new UserDto(userId, email, name);
    var token = CreateJwtToken(jwtKey, jwtIssuer, jwtAudience, userId, email, name);

    return Results.Ok(new AuthResponseDto(token, user));
});

app.MapPost("/api/auth/login", async (LoginDto dto) =>
{
    var email = (dto.email ?? string.Empty).Trim().ToLowerInvariant();
    var password = dto.password ?? string.Empty;

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
    {
        return Results.BadRequest(new { message = "Email and password are required." });
    }

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT Id, Email, PasswordHash, Name FROM Users WHERE Email = $email LIMIT 1;";
    cmd.Parameters.AddWithValue("$email", email);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
    {
        return Results.Json(new { message = "Invalid credentials." }, statusCode: StatusCodes.Status401Unauthorized);
    }

    var userId = reader.GetInt64(0);
    var storedEmail = reader.GetString(1);
    var passwordHash = reader.IsDBNull(2) ? null : reader.GetString(2);
    var name = reader.IsDBNull(3) ? null : reader.GetString(3);

    if (string.IsNullOrWhiteSpace(passwordHash))
    {
        return Results.Json(new { message = "This account uses Google login." }, statusCode: StatusCodes.Status401Unauthorized);
    }

    var verify = passwordHasher.VerifyHashedPassword(new UserForHashing(), passwordHash, password);
    if (verify == PasswordVerificationResult.Failed)
    {
        return Results.Json(new { message = "Invalid credentials." }, statusCode: StatusCodes.Status401Unauthorized);
    }

    if (verify == PasswordVerificationResult.SuccessRehashNeeded)
    {
        var newHash = passwordHasher.HashPassword(new UserForHashing(), password);
        var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);

        var updateCmd = conn.CreateCommand();
        updateCmd.CommandText = "UPDATE Users SET PasswordHash = $hash, UpdatedAt = $updatedAt WHERE Id = $id;";
        updateCmd.Parameters.AddWithValue("$hash", newHash);
        updateCmd.Parameters.AddWithValue("$updatedAt", now);
        updateCmd.Parameters.AddWithValue("$id", userId);
        await updateCmd.ExecuteNonQueryAsync();
    }

    var user = new UserDto(userId, storedEmail, name);
    var token = CreateJwtToken(jwtKey, jwtIssuer, jwtAudience, userId, storedEmail, name);
    return Results.Ok(new AuthResponseDto(token, user));
});

app.MapPost("/api/auth/google", async (GoogleLoginDto dto) =>
{
    var idToken = dto.idToken ?? string.Empty;
    if (string.IsNullOrWhiteSpace(idToken))
    {
        return Results.BadRequest(new { message = "Missing Google credential." });
    }

    if (string.IsNullOrWhiteSpace(googleClientId))
    {
        return Results.Problem("Google ClientId is not configured on the API.", statusCode: StatusCodes.Status500InternalServerError);
    }

    GoogleJsonWebSignature.Payload payload;
    try
    {
        payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { googleClientId }
        });
    }
    catch
    {
        return Results.Json(new { message = "Invalid Google credential." }, statusCode: StatusCodes.Status401Unauthorized);
    }

    var email = (payload.Email ?? string.Empty).Trim().ToLowerInvariant();
    var sub = payload.Subject ?? string.Empty;
    var name = string.IsNullOrWhiteSpace(payload.Name) ? null : payload.Name.Trim();

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(sub))
    {
        return Results.Json(new { message = "Invalid Google credential." }, statusCode: StatusCodes.Status401Unauthorized);
    }

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    long userId;
    string? storedName;

    var bySubCmd = conn.CreateCommand();
    bySubCmd.CommandText = "SELECT Id, Name FROM Users WHERE GoogleSub = $sub LIMIT 1;";
    bySubCmd.Parameters.AddWithValue("$sub", sub);

    await using (var r = await bySubCmd.ExecuteReaderAsync())
    {
        if (await r.ReadAsync())
        {
            userId = r.GetInt64(0);
            storedName = r.IsDBNull(1) ? null : r.GetString(1);
            var user = new UserDto(userId, email, storedName);
            var token = CreateJwtToken(jwtKey, jwtIssuer, jwtAudience, userId, email, storedName);
            return Results.Ok(new AuthResponseDto(token, user));
        }
    }

    var byEmailCmd = conn.CreateCommand();
    byEmailCmd.CommandText = "SELECT Id, Name, GoogleSub FROM Users WHERE Email = $email LIMIT 1;";
    byEmailCmd.Parameters.AddWithValue("$email", email);

    await using (var r = await byEmailCmd.ExecuteReaderAsync())
    {
        if (await r.ReadAsync())
        {
            userId = r.GetInt64(0);
            storedName = r.IsDBNull(1) ? null : r.GetString(1);
            var existingSub = r.IsDBNull(2) ? null : r.GetString(2);

            if (string.IsNullOrWhiteSpace(existingSub) || !string.Equals(existingSub, sub, StringComparison.Ordinal))
            {
                var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);

                var updateCmd = conn.CreateCommand();
                updateCmd.CommandText = "UPDATE Users SET GoogleSub = $sub, UpdatedAt = $updatedAt WHERE Id = $id;";
                updateCmd.Parameters.AddWithValue("$sub", sub);
                updateCmd.Parameters.AddWithValue("$updatedAt", now);
                updateCmd.Parameters.AddWithValue("$id", userId);
                await updateCmd.ExecuteNonQueryAsync();
            }

            if (string.IsNullOrWhiteSpace(storedName) && !string.IsNullOrWhiteSpace(name))
            {
                var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);

                var updateNameCmd = conn.CreateCommand();
                updateNameCmd.CommandText = "UPDATE Users SET Name = $name, UpdatedAt = $updatedAt WHERE Id = $id;";
                updateNameCmd.Parameters.AddWithValue("$name", name);
                updateNameCmd.Parameters.AddWithValue("$updatedAt", now);
                updateNameCmd.Parameters.AddWithValue("$id", userId);
                await updateNameCmd.ExecuteNonQueryAsync();
                storedName = name;
            }

            var user = new UserDto(userId, email, storedName);
            var token = CreateJwtToken(jwtKey, jwtIssuer, jwtAudience, userId, email, storedName);
            return Results.Ok(new AuthResponseDto(token, user));
        }
    }

    var createdAt = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);

    var insertCmd = conn.CreateCommand();
    insertCmd.CommandText = @"INSERT INTO Users (Email, PasswordHash, GoogleSub, Name, CreatedAt, UpdatedAt)
VALUES ($email, NULL, $sub, $name, $createdAt, $updatedAt);";
    insertCmd.Parameters.AddWithValue("$email", email);
    insertCmd.Parameters.AddWithValue("$sub", sub);
    insertCmd.Parameters.AddWithValue("$name", (object?)name ?? DBNull.Value);
    insertCmd.Parameters.AddWithValue("$createdAt", createdAt);
    insertCmd.Parameters.AddWithValue("$updatedAt", createdAt);

    try
    {
        await insertCmd.ExecuteNonQueryAsync();
    }
    catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
    {
        return Results.Conflict(new { message = "Email already exists." });
    }

    var lastIdCmd = conn.CreateCommand();
    lastIdCmd.CommandText = "SELECT last_insert_rowid();";
    userId = Convert.ToInt64(await lastIdCmd.ExecuteScalarAsync() ?? 0, CultureInfo.InvariantCulture);
    var newUser = new UserDto(userId, email, name);
    var newToken = CreateJwtToken(jwtKey, jwtIssuer, jwtAudience, userId, email, name);
    return Results.Ok(new AuthResponseDto(newToken, newUser));
});

app.MapGet("/api/auth/me", async (ClaimsPrincipal principal) =>
{
    var subClaim = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (string.IsNullOrWhiteSpace(subClaim) || !long.TryParse(subClaim, out var userId))
    {
        return Results.Unauthorized();
    }

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT Id, Email, Name FROM Users WHERE Id = $id LIMIT 1;";
    cmd.Parameters.AddWithValue("$id", userId);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
    {
        return Results.Unauthorized();
    }

    var email = reader.GetString(1);
    var name = reader.IsDBNull(2) ? null : reader.GetString(2);

    return Results.Ok(new UserDto(userId, email, name));
}).RequireAuthorization();

app.MapGet("/api/judgements", async () =>
{
    var items = new List<JudgementListItemDto>();

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT Slug, Category, Title, Subtitle, PublishedOn, IsLive, Author, Views FROM Articles WHERE Kind = 'judgement' ORDER BY PublishedOn DESC, Id DESC;";

    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        items.Add(new JudgementListItemDto(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.GetInt64(5) != 0,
            reader.GetString(6),
            reader.GetInt64(7)
        ));
    }

    return Results.Ok(items);
});

app.MapGet("/api/judgements/{slug}", async (string slug) =>
{
    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var incrCmd = conn.CreateCommand();
    incrCmd.CommandText = "UPDATE Articles SET Views = Views + 1 WHERE Slug = $slug AND Kind = 'judgement';";
    incrCmd.Parameters.AddWithValue("$slug", slug);
    await incrCmd.ExecuteNonQueryAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT Slug, Category, Title, Subtitle, Author, PublishedOn, Image, CaseTitle, JudgmentUrl, SourceUrl, BodyJson, Views FROM Articles WHERE Slug = $slug AND Kind = 'judgement' LIMIT 1;";
    cmd.Parameters.AddWithValue("$slug", slug);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
    {
        return Results.NotFound();
    }

    var bodyJson = reader.GetString(10);
    var body = JsonSerializer.Deserialize<JsonElement>(bodyJson);

    var dto = new JudgementDetailDto(
        slug: reader.GetString(0),
        category: reader.GetString(1),
        title: reader.GetString(2),
        subtitle: reader.GetString(3),
        author: reader.GetString(4),
        date: reader.GetString(5),
        image: reader.GetString(6),
        caseTitle: reader.IsDBNull(7) ? null : reader.GetString(7),
        judgmentUrl: reader.IsDBNull(8) ? null : reader.GetString(8),
        sourceUrl: reader.IsDBNull(9) ? null : reader.GetString(9),
        body: body,
        views: reader.GetInt64(11)
    );

    return Results.Ok(dto);
});

app.MapGet("/api/blog", async () =>
{
    var items = new List<JudgementListItemDto>();

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT Slug, Category, Title, Subtitle, PublishedOn, IsLive, Author, Views FROM Articles WHERE Kind = 'blog' ORDER BY PublishedOn DESC, Id DESC;";

    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        items.Add(new JudgementListItemDto(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.GetInt64(5) != 0,
            reader.GetString(6),
            reader.GetInt64(7)
        ));
    }

    return Results.Ok(items);
});

app.MapGet("/api/blog/{slug}", async (string slug) =>
{
    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var incrCmd = conn.CreateCommand();
    incrCmd.CommandText = "UPDATE Articles SET Views = Views + 1 WHERE Slug = $slug AND Kind = 'blog';";
    incrCmd.Parameters.AddWithValue("$slug", slug);
    await incrCmd.ExecuteNonQueryAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT Slug, Category, Title, Subtitle, Author, PublishedOn, Image, BodyJson, Views FROM Articles WHERE Slug = $slug AND Kind = 'blog' LIMIT 1;";
    cmd.Parameters.AddWithValue("$slug", slug);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
    {
        return Results.NotFound();
    }

    var bodyJson = reader.GetString(7);
    var body = JsonSerializer.Deserialize<JsonElement>(bodyJson);

    var dto = new BlogDetailDto(
        slug: reader.GetString(0),
        category: reader.GetString(1),
        title: reader.GetString(2),
        subtitle: reader.GetString(3),
        author: reader.GetString(4),
        date: reader.GetString(5),
        image: reader.GetString(6),
        body: body,
        views: reader.GetInt64(8)
    );

    return Results.Ok(dto);
});

app.MapGet("/api/admin/ping", (HttpRequest req) =>
{
    if (!IsAdmin(req, adminKey))
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new { ok = true });
});

app.MapPost("/api/judgements", async (HttpRequest req, JudgementCreateDto dto) =>
{
    if (!IsAdmin(req, adminKey))
    {
        return Results.Unauthorized();
    }

    var slug = string.IsNullOrWhiteSpace(dto.slug) ? Slugify(dto.title ?? string.Empty) : Slugify(dto.slug);
    var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);

    var publishedOn = NormalizeDate(dto.publishedOn);
    var bodyJson = dto.body.ValueKind == JsonValueKind.Undefined ? "[]" : dto.body.GetRawText();

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = @"INSERT INTO Articles (Slug, Kind, Category, Title, Subtitle, Author, PublishedOn, Image, CaseTitle, JudgmentUrl, SourceUrl, BodyJson, CreatedAt, UpdatedAt)
VALUES ($slug, $kind, $category, $title, $subtitle, $author, $publishedOn, $image, $caseTitle, $judgmentUrl, $sourceUrl, $bodyJson, $createdAt, $updatedAt);";

    cmd.Parameters.AddWithValue("$slug", slug);
    cmd.Parameters.AddWithValue("$kind", "judgement");
    cmd.Parameters.AddWithValue("$category", dto.category ?? string.Empty);
    cmd.Parameters.AddWithValue("$title", dto.title ?? string.Empty);
    cmd.Parameters.AddWithValue("$subtitle", dto.subtitle ?? string.Empty);
    cmd.Parameters.AddWithValue("$author", dto.author ?? string.Empty);
    cmd.Parameters.AddWithValue("$publishedOn", publishedOn);
    cmd.Parameters.AddWithValue("$image", dto.image ?? string.Empty);
    cmd.Parameters.AddWithValue("$caseTitle", (object?)dto.caseTitle ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$judgmentUrl", (object?)dto.judgmentUrl ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$sourceUrl", (object?)dto.sourceUrl ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$bodyJson", bodyJson);
    cmd.Parameters.AddWithValue("$createdAt", now);
    cmd.Parameters.AddWithValue("$updatedAt", now);

    try
    {
        await cmd.ExecuteNonQueryAsync();
    }
    catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
    {
        return Results.Conflict(new { message = "Slug already exists.", slug });
    }

    return Results.Created($"/api/judgements/{slug}", new { slug });
});

app.MapPut("/api/judgements/{slug}", async (HttpRequest req, string slug, JudgementCreateDto dto) =>
{
    if (!IsAdmin(req, adminKey))
    {
        return Results.Unauthorized();
    }

    var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);
    var publishedOn = NormalizeDate(dto.publishedOn);
    var bodyJson = dto.body.ValueKind == JsonValueKind.Undefined ? "[]" : dto.body.GetRawText();

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = @"UPDATE Articles SET
  Category = $category, Title = $title, Subtitle = $subtitle, Author = $author,
  PublishedOn = $publishedOn, Image = $image, CaseTitle = $caseTitle,
  JudgmentUrl = $judgmentUrl, SourceUrl = $sourceUrl, BodyJson = $bodyJson, UpdatedAt = $updatedAt
WHERE Slug = $slug AND Kind = 'judgement';";

    cmd.Parameters.AddWithValue("$slug", slug);
    cmd.Parameters.AddWithValue("$category", dto.category ?? string.Empty);
    cmd.Parameters.AddWithValue("$title", dto.title ?? string.Empty);
    cmd.Parameters.AddWithValue("$subtitle", dto.subtitle ?? string.Empty);
    cmd.Parameters.AddWithValue("$author", dto.author ?? string.Empty);
    cmd.Parameters.AddWithValue("$publishedOn", publishedOn);
    cmd.Parameters.AddWithValue("$image", dto.image ?? string.Empty);
    cmd.Parameters.AddWithValue("$caseTitle", (object?)dto.caseTitle ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$judgmentUrl", (object?)dto.judgmentUrl ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$sourceUrl", (object?)dto.sourceUrl ?? DBNull.Value);
    cmd.Parameters.AddWithValue("$bodyJson", bodyJson);
    cmd.Parameters.AddWithValue("$updatedAt", now);

    var rows = await cmd.ExecuteNonQueryAsync();
    return rows == 0 ? Results.NotFound() : Results.Ok(new { slug });
});

app.MapPost("/api/blog", async (HttpRequest req, JudgementCreateDto dto) =>
{
    if (!IsAdmin(req, adminKey))
    {
        return Results.Unauthorized();
    }

    var slug = string.IsNullOrWhiteSpace(dto.slug) ? Slugify(dto.title ?? string.Empty) : Slugify(dto.slug);
    var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);
    var publishedOn = NormalizeDate(dto.publishedOn);
    var bodyJson = dto.body.ValueKind == JsonValueKind.Undefined ? "[]" : dto.body.GetRawText();

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = @"INSERT INTO Articles (Slug, Kind, Category, Title, Subtitle, Author, PublishedOn, Image, CaseTitle, JudgmentUrl, SourceUrl, BodyJson, CreatedAt, UpdatedAt)
VALUES ($slug, 'blog', $category, $title, $subtitle, $author, $publishedOn, $image, NULL, NULL, NULL, $bodyJson, $createdAt, $updatedAt);";

    cmd.Parameters.AddWithValue("$slug", slug);
    cmd.Parameters.AddWithValue("$category", dto.category ?? string.Empty);
    cmd.Parameters.AddWithValue("$title", dto.title ?? string.Empty);
    cmd.Parameters.AddWithValue("$subtitle", dto.subtitle ?? string.Empty);
    cmd.Parameters.AddWithValue("$author", dto.author ?? string.Empty);
    cmd.Parameters.AddWithValue("$publishedOn", publishedOn);
    cmd.Parameters.AddWithValue("$image", dto.image ?? string.Empty);
    cmd.Parameters.AddWithValue("$bodyJson", bodyJson);
    cmd.Parameters.AddWithValue("$createdAt", now);
    cmd.Parameters.AddWithValue("$updatedAt", now);

    try
    {
        await cmd.ExecuteNonQueryAsync();
    }
    catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
    {
        return Results.Conflict(new { message = "Slug already exists.", slug });
    }

    return Results.Created($"/api/blog/{slug}", new { slug });
});

app.MapPut("/api/blog/{slug}", async (HttpRequest req, string slug, JudgementCreateDto dto) =>
{
    if (!IsAdmin(req, adminKey))
    {
        return Results.Unauthorized();
    }

    var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);
    var publishedOn = NormalizeDate(dto.publishedOn);
    var bodyJson = dto.body.ValueKind == JsonValueKind.Undefined ? "[]" : dto.body.GetRawText();

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = @"UPDATE Articles SET
  Category = $category, Title = $title, Subtitle = $subtitle, Author = $author,
  PublishedOn = $publishedOn, Image = $image, BodyJson = $bodyJson, UpdatedAt = $updatedAt
WHERE Slug = $slug AND Kind = 'blog';";

    cmd.Parameters.AddWithValue("$slug", slug);
    cmd.Parameters.AddWithValue("$category", dto.category ?? string.Empty);
    cmd.Parameters.AddWithValue("$title", dto.title ?? string.Empty);
    cmd.Parameters.AddWithValue("$subtitle", dto.subtitle ?? string.Empty);
    cmd.Parameters.AddWithValue("$author", dto.author ?? string.Empty);
    cmd.Parameters.AddWithValue("$publishedOn", publishedOn);
    cmd.Parameters.AddWithValue("$image", dto.image ?? string.Empty);
    cmd.Parameters.AddWithValue("$bodyJson", bodyJson);
    cmd.Parameters.AddWithValue("$updatedAt", now);

    var rows = await cmd.ExecuteNonQueryAsync();
    return rows == 0 ? Results.NotFound() : Results.Ok(new { slug });
});

app.MapPatch("/api/judgements/{slug}/live", async (HttpRequest req, string slug) =>
{
    if (!IsAdmin(req, adminKey)) return Results.Unauthorized();
    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();
    var cmd = conn.CreateCommand();
    cmd.CommandText = "UPDATE Articles SET IsLive = 1 - IsLive WHERE Slug = $slug AND Kind = 'judgement'; SELECT IsLive FROM Articles WHERE Slug = $slug AND Kind = 'judgement';";
    cmd.Parameters.AddWithValue("$slug", slug);
    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.NotFound();
    var isLive = reader.GetInt64(0) != 0;
    return Results.Ok(new { slug, isLive });
});

app.MapPatch("/api/blog/{slug}/live", async (HttpRequest req, string slug) =>
{
    if (!IsAdmin(req, adminKey)) return Results.Unauthorized();
    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();
    var cmd = conn.CreateCommand();
    cmd.CommandText = "UPDATE Articles SET IsLive = 1 - IsLive WHERE Slug = $slug AND Kind = 'blog'; SELECT IsLive FROM Articles WHERE Slug = $slug AND Kind = 'blog';";
    cmd.Parameters.AddWithValue("$slug", slug);
    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.NotFound();
    var isLive = reader.GetInt64(0) != 0;
    return Results.Ok(new { slug, isLive });
});

app.MapDelete("/api/judgements/{slug}", async (HttpRequest req, string slug) =>
{
    if (!IsAdmin(req, adminKey)) return Results.Unauthorized();

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = "DELETE FROM Articles WHERE Slug = $slug AND Kind = 'judgement';";
    cmd.Parameters.AddWithValue("$slug", slug);

    var rows = await cmd.ExecuteNonQueryAsync();
    return rows == 0 ? Results.NotFound() : Results.Ok(new { slug });
});

app.MapDelete("/api/blog/{slug}", async (HttpRequest req, string slug) =>
{
    if (!IsAdmin(req, adminKey)) return Results.Unauthorized();

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = "DELETE FROM Articles WHERE Slug = $slug AND Kind = 'blog';";
    cmd.Parameters.AddWithValue("$slug", slug);

    var rows = await cmd.ExecuteNonQueryAsync();
    return rows == 0 ? Results.NotFound() : Results.Ok(new { slug });
});

app.MapPost("/api/contact", async (ContactInquiryCreateDto dto) =>
{
    if (string.IsNullOrWhiteSpace(dto.name) ||
        string.IsNullOrWhiteSpace(dto.email) ||
        string.IsNullOrWhiteSpace(dto.subject) ||
        string.IsNullOrWhiteSpace(dto.message))
    {
        return Results.BadRequest(new { message = "Name, Email, Subject and Message are required." });
    }

    var submittedAt = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = @"INSERT INTO ContactInquiries (Name, Email, Phone, Subject, Message, SubmittedAt)
VALUES ($name, $email, $phone, $subject, $message, $submittedAt);";

    cmd.Parameters.AddWithValue("$name", dto.name.Trim());
    cmd.Parameters.AddWithValue("$email", dto.email.Trim());
    cmd.Parameters.AddWithValue("$phone", string.IsNullOrWhiteSpace(dto.phone) ? (object)DBNull.Value : dto.phone.Trim());
    cmd.Parameters.AddWithValue("$subject", dto.subject.Trim());
    cmd.Parameters.AddWithValue("$message", dto.message.Trim());
    cmd.Parameters.AddWithValue("$submittedAt", submittedAt);

    await cmd.ExecuteNonQueryAsync();

    return Results.Ok(new { message = "Your inquiry has been received. We will get back to you shortly." });
});

app.MapGet("/api/admin/contact", async (HttpRequest req) =>
{
    if (!IsAdmin(req, adminKey))
    {
        return Results.Unauthorized();
    }

    var items = new List<ContactInquiryDto>();

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT Id, Name, Email, Phone, Subject, Message, SubmittedAt FROM ContactInquiries ORDER BY SubmittedAt DESC;";

    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        items.Add(new ContactInquiryDto(
            reader.GetInt32(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.GetString(4),
            reader.GetString(5),
            reader.GetString(6)
        ));
    }

    return Results.Ok(items);
});

// ── COMMENTS ────────────────────────────────────────────────────────────────

app.MapGet("/api/comments/{slug}", async (string slug) =>
{
    var items = new List<CommentDto>();
    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();
    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT Id, AuthorName, Body, CreatedAt FROM Comments WHERE Slug = $slug ORDER BY CreatedAt ASC;";
    cmd.Parameters.AddWithValue("$slug", slug);
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        items.Add(new CommentDto(reader.GetInt64(0), reader.GetString(1), reader.GetString(2), reader.GetString(3)));
    }
    return Results.Ok(items);
});

app.MapPost("/api/comments/{slug}", async (string slug, CommentCreateDto dto) =>
{
    if (string.IsNullOrWhiteSpace(dto.authorName) || string.IsNullOrWhiteSpace(dto.body))
        return Results.BadRequest(new { message = "Name and comment are required." });

    if (dto.body.Length > 1000)
        return Results.BadRequest(new { message = "Comment is too long (max 1000 characters)." });

    var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);
    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();
    var cmd = conn.CreateCommand();
    cmd.CommandText = "INSERT INTO Comments (Slug, Kind, AuthorName, Body, CreatedAt) VALUES ($slug, $kind, $name, $body, $now);";
    cmd.Parameters.AddWithValue("$slug", slug);
    cmd.Parameters.AddWithValue("$kind", dto.kind ?? "judgement");
    cmd.Parameters.AddWithValue("$name", dto.authorName.Trim());
    cmd.Parameters.AddWithValue("$body", dto.body.Trim());
    cmd.Parameters.AddWithValue("$now", now);
    await cmd.ExecuteNonQueryAsync();

    var idCmd = conn.CreateCommand();
    idCmd.CommandText = "SELECT last_insert_rowid();";
    var id = Convert.ToInt64(await idCmd.ExecuteScalarAsync() ?? 0, CultureInfo.InvariantCulture);
    return Results.Ok(new CommentDto(id, dto.authorName.Trim(), dto.body.Trim(), now));
});

// ── LIKES ────────────────────────────────────────────────────────────────────

app.MapGet("/api/likes/{slug}", async (string slug) =>
{
    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();
    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT COUNT(*) FROM Likes WHERE Slug = $slug;";
    cmd.Parameters.AddWithValue("$slug", slug);
    var count = Convert.ToInt64(await cmd.ExecuteScalarAsync() ?? 0L, CultureInfo.InvariantCulture);
    return Results.Ok(new { count });
});

app.MapPost("/api/likes/{slug}", async (string slug, LikeDto dto) =>
{
    if (string.IsNullOrWhiteSpace(dto.sessionId))
        return Results.BadRequest(new { message = "sessionId is required." });

    var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);
    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();
    var cmd = conn.CreateCommand();
    cmd.CommandText = "INSERT OR IGNORE INTO Likes (Slug, Kind, SessionId, CreatedAt) VALUES ($slug, $kind, $sid, $now);";
    cmd.Parameters.AddWithValue("$slug", slug);
    cmd.Parameters.AddWithValue("$kind", dto.kind ?? "judgement");
    cmd.Parameters.AddWithValue("$sid", dto.sessionId);
    cmd.Parameters.AddWithValue("$now", now);
    await cmd.ExecuteNonQueryAsync();

    var countCmd = conn.CreateCommand();
    countCmd.CommandText = "SELECT COUNT(*) FROM Likes WHERE Slug = $slug;";
    countCmd.Parameters.AddWithValue("$slug", slug);
    var count = Convert.ToInt64(await countCmd.ExecuteScalarAsync() ?? 0L, CultureInfo.InvariantCulture);
    return Results.Ok(new { count });
});

app.MapDelete("/api/likes/{slug}", async (string slug, string sessionId) =>
{
    if (string.IsNullOrWhiteSpace(sessionId))
        return Results.BadRequest(new { message = "sessionId is required." });

    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();
    var cmd = conn.CreateCommand();
    cmd.CommandText = "DELETE FROM Likes WHERE Slug = $slug AND SessionId = $sid;";
    cmd.Parameters.AddWithValue("$slug", slug);
    cmd.Parameters.AddWithValue("$sid", sessionId);
    await cmd.ExecuteNonQueryAsync();

    var countCmd = conn.CreateCommand();
    countCmd.CommandText = "SELECT COUNT(*) FROM Likes WHERE Slug = $slug;";
    countCmd.Parameters.AddWithValue("$slug", slug);
    var count = Convert.ToInt64(await countCmd.ExecuteScalarAsync() ?? 0L, CultureInfo.InvariantCulture);
    return Results.Ok(new { count });
});

app.Run();

static bool IsAdmin(HttpRequest req, string adminKey)
{
    if (string.IsNullOrWhiteSpace(adminKey))
    {
        return false;
    }

    if (!req.Headers.TryGetValue("X-Admin-Key", out var key))
    {
        return false;
    }

    return string.Equals(key.ToString(), adminKey, StringComparison.Ordinal);
}

static async Task EnsureDatabaseAsync(string connectionString)
{
    await using var conn = new SqliteConnection(connectionString);
    await conn.OpenAsync();

    // Migration: Rename old Judgements table to Articles if it exists
    var checkTableCmd = conn.CreateCommand();
    checkTableCmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='Judgements';";
    var hasOldTable = await checkTableCmd.ExecuteScalarAsync() is not null;
    if (hasOldTable)
    {
        var renameCmd = conn.CreateCommand();
        renameCmd.CommandText = "ALTER TABLE Judgements RENAME TO Articles;";
        await renameCmd.ExecuteNonQueryAsync();
    }

    var cmd = conn.CreateCommand();
    cmd.CommandText = @"CREATE TABLE IF NOT EXISTS Articles (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Slug TEXT NOT NULL UNIQUE,
  Kind TEXT NOT NULL DEFAULT 'judgement',
  Category TEXT NOT NULL,
  Title TEXT NOT NULL,
  Subtitle TEXT NOT NULL,
  Author TEXT NOT NULL,
  PublishedOn TEXT NOT NULL,
  Image TEXT NOT NULL,
  CaseTitle TEXT NULL,
  JudgmentUrl TEXT NULL,
  SourceUrl TEXT NULL,
  BodyJson TEXT NOT NULL,
  CreatedAt TEXT NOT NULL,
  UpdatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS IX_Articles_PublishedOn ON Articles(PublishedOn);

CREATE TABLE IF NOT EXISTS Users (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Email TEXT NOT NULL UNIQUE,
  PasswordHash TEXT NULL,
  GoogleSub TEXT NULL UNIQUE,
  Name TEXT NULL,
  CreatedAt TEXT NOT NULL,
  UpdatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS IX_Users_Email ON Users(Email);
CREATE INDEX IF NOT EXISTS IX_Users_GoogleSub ON Users(GoogleSub);

CREATE TABLE IF NOT EXISTS ContactInquiries (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Name TEXT NOT NULL,
  Email TEXT NOT NULL,
  Phone TEXT NULL,
  Subject TEXT NOT NULL,
  Message TEXT NOT NULL,
  SubmittedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS IX_ContactInquiries_SubmittedAt ON ContactInquiries(SubmittedAt);

CREATE TABLE IF NOT EXISTS Comments (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Slug TEXT NOT NULL,
  Kind TEXT NOT NULL DEFAULT 'judgement',
  AuthorName TEXT NOT NULL,
  Body TEXT NOT NULL,
  CreatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS IX_Comments_Slug ON Comments(Slug);

CREATE TABLE IF NOT EXISTS Likes (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Slug TEXT NOT NULL,
  Kind TEXT NOT NULL DEFAULT 'judgement',
  SessionId TEXT NOT NULL,
  CreatedAt TEXT NOT NULL,
  UNIQUE(Slug, SessionId)
);
CREATE INDEX IF NOT EXISTS IX_Likes_Slug ON Likes(Slug);";

    await cmd.ExecuteNonQueryAsync();

    var kindExistsCmd = conn.CreateCommand();
    kindExistsCmd.CommandText = "PRAGMA table_info(Articles);";

    var hasKind = false;
    await using (var reader = await kindExistsCmd.ExecuteReaderAsync())
    {
        while (await reader.ReadAsync())
        {
            var name = reader.GetString(1);
            if (string.Equals(name, "Kind", StringComparison.OrdinalIgnoreCase))
            {
                hasKind = true;
                break;
            }
        }
    }

    if (!hasKind)
    {
        var alterCmd = conn.CreateCommand();
        alterCmd.CommandText = "ALTER TABLE Articles ADD COLUMN Kind TEXT NOT NULL DEFAULT 'judgement';";
        await alterCmd.ExecuteNonQueryAsync();
    }

    var kindIndexCmd = conn.CreateCommand();
    kindIndexCmd.CommandText = "CREATE INDEX IF NOT EXISTS IX_Articles_Kind ON Articles(Kind);";
    await kindIndexCmd.ExecuteNonQueryAsync();

    var hasIsLive = false;
    using (var colCmd2 = conn.CreateCommand())
    {
        colCmd2.CommandText = "PRAGMA table_info(Articles);";
        await using var r2 = await colCmd2.ExecuteReaderAsync();
        while (await r2.ReadAsync())
        {
            if (string.Equals(r2.GetString(1), "IsLive", StringComparison.OrdinalIgnoreCase))
            { hasIsLive = true; break; }
        }
    }
    if (!hasIsLive)
    {
        var alterCmd2 = conn.CreateCommand();
        alterCmd2.CommandText = "ALTER TABLE Articles ADD COLUMN IsLive INTEGER NOT NULL DEFAULT 1;";
        await alterCmd2.ExecuteNonQueryAsync();
    }

    var hasViews = false;
    using (var colCmd3 = conn.CreateCommand())
    {
        colCmd3.CommandText = "PRAGMA table_info(Articles);";
        await using var r3 = await colCmd3.ExecuteReaderAsync();
        while (await r3.ReadAsync())
        {
            if (string.Equals(r3.GetString(1), "Views", StringComparison.OrdinalIgnoreCase))
            { hasViews = true; break; }
        }
    }
    if (!hasViews)
    {
        var alterCmd3 = conn.CreateCommand();
        alterCmd3.CommandText = "ALTER TABLE Articles ADD COLUMN Views INTEGER NOT NULL DEFAULT 0;";
        await alterCmd3.ExecuteNonQueryAsync();
    }

    await SeedContentAsync(conn);
}

static async Task SeedContentAsync(SqliteConnection conn)
{
    var now = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);

    var insertCmd = conn.CreateCommand();
    insertCmd.CommandText = @"INSERT OR IGNORE INTO Articles (Slug, Kind, Category, Title, Subtitle, Author, PublishedOn, Image, CaseTitle, JudgmentUrl, SourceUrl, BodyJson, CreatedAt, UpdatedAt)
VALUES ($slug, $kind, $category, $title, $subtitle, $author, $publishedOn, $image, $caseTitle, $judgmentUrl, $sourceUrl, $bodyJson, $createdAt, $updatedAt);";

    foreach (var seed in GetSeedRows())
    {
        insertCmd.Parameters.Clear();
        insertCmd.Parameters.AddWithValue("$slug", seed.Slug);
        insertCmd.Parameters.AddWithValue("$kind", seed.Kind);
        insertCmd.Parameters.AddWithValue("$category", seed.Category);
        insertCmd.Parameters.AddWithValue("$title", seed.Title);
        insertCmd.Parameters.AddWithValue("$subtitle", seed.Subtitle);
        insertCmd.Parameters.AddWithValue("$author", seed.Author);
        insertCmd.Parameters.AddWithValue("$publishedOn", seed.PublishedOn);
        insertCmd.Parameters.AddWithValue("$image", seed.Image);
        insertCmd.Parameters.AddWithValue("$caseTitle", (object?)seed.CaseTitle ?? DBNull.Value);
        insertCmd.Parameters.AddWithValue("$judgmentUrl", (object?)seed.JudgmentUrl ?? DBNull.Value);
        insertCmd.Parameters.AddWithValue("$sourceUrl", (object?)seed.SourceUrl ?? DBNull.Value);
        insertCmd.Parameters.AddWithValue("$bodyJson", seed.BodyJson);
        insertCmd.Parameters.AddWithValue("$createdAt", now);
        insertCmd.Parameters.AddWithValue("$updatedAt", now);

        await insertCmd.ExecuteNonQueryAsync();
    }
}

static IReadOnlyList<SeedRow> GetSeedRows() =>
[
    new SeedRow(
        Slug: "triple-talaq-rejects-husband-plea",
        Kind: "judgement",
        Category: "HIGH COURT",
        Title: "Triple Talaq Cannot Be Judicially Endorsed: Madhya Pradesh High Court Rejects Husband’s Plea, Cites Shayara Bano Judgment",
        Subtitle: "The Madhya Pradesh High Court refused to recognise an alleged triple talaq divorce, observing that courts cannot validate a practice declared unconstitutional by the Supreme Court of India in Shayara Bano v. Union of India, while calling the husband’s plea “vexatious and frivolous”.",
        Author: "Satyajeet Barik",
        PublishedOn: "2026-05-15",
        Image: "judge_gavel",
        CaseTitle: "Smt. Rubina Kavi v. Rizwan Ali",
        JudgmentUrl: "https://lawchakra.in/wp-content/uploads/2026/05/smt-rubina-kavi-v-rizwan-ali-2177332_smallpdf.pdf",
        SourceUrl: "https://lawchakra.in/high-court/triple-talaq-rejects-husband-plea/",
        BodyJson:
        """
        [
          {
            "type": "p",
            "text": "The Madhya Pradesh High Court has ruled that courts are not permitted to grant declarations affirming triple talaq, after the Supreme Court of India struck down the practice as unconstitutional in Shayara Bano v. Union of India. The High Court dismissed a husband’s request for judicial recognition of an alleged oral divorce stated to have been issued in 2015."
          },
          {
            "type": "p",
            "text": "Justice Vivek Jain remarked that the husband’s case was “vexatious and frivolous,” adding that it sought judicial endorsement of a practice that had already been held arbitrary and inconsistent with Article 14 of the Constitution."
          },
          {
            "type": "alsoRead",
            "text": "Bombay HC: Only Instant Triple Talaq is Illegal, Talaq-e-Ahsan Still Valid – FIR Quashed",
            "href": "https://lawchakra.in/high-court/talaq-e-ahsan-still-valid-fir-quashed/"
          },
          {
            "type": "p",
            "text": "The matter stemmed from a civil revision petition and a connected miscellaneous petition filed by the wife, Rubina Kavi, against Rizwan Ali. The husband had earlier filed a civil suit seeking a declaration that he had divorced his wife by triple talaq on January 14, 2015, allegedly in the presence of two witnesses."
          },
          {
            "type": "p",
            "text": "In his initial plaint, the husband claimed that his wife caused him mental cruelty, after which he allegedly pronounced triple talaq orally and later documented it in writing through a talaqnama dated January 14, 2015."
          },
          {
            "type": "p",
            "text": "During the proceedings, the Supreme Court delivered its decision in Shayara Bano in 2017, declaring instant triple talaq unconstitutional. After the ruling, the wife filed an application under Order 7 Rule 11 of the Code of Civil Procedure, urging that the suit was barred by law. The civil court rejected this in 2018, reasoning that the Supreme Court’s decision would apply prospectively rather than retrospectively."
          },
          {
            "type": "alsoRead",
            "text": "“Uniform Civil Code is Unacceptable as it Conflicts With Sharia Law”: All India Muslim Personal Law Board",
            "href": "https://lawchakra.in/legal-updates/uniform-civil-code-is-unacceptable-muslim-board/"
          },
          {
            "type": "p",
            "text": "Once the case was transferred to the Family Court, the wife again sought rejection of the plaint. In 2023, the husband amended his pleadings and argued that the divorce was not an instant triple talaq issued at one time. He claimed instead that it was pronounced separately on three occasions between 2013 and 2014."
          },
          {
            "type": "p",
            "text": "The High Court observed that neither the original plaint nor the talaqnama referred to any earlier talaq in 2013 or 2014. Rather, both documents specifically mentioned triple talaq allegedly pronounced on January 14, 2015."
          },
          {
            "type": "p",
            "text": "Rejecting the husband’s revised version, the Court held that the amendment appeared to be no more than “an attempt to wriggle out of the judgment” passed in Shayara Bano."
          },
          {
            "type": "p",
            "text": "The Court further explained that constitutional court interpretations of law generally apply retrospectively unless the judgment itself limits the effect. Relying on an earlier division bench decision of the Madhya Pradesh High Court, it reiterated that once the Supreme Court had declared triple talaq unconstitutional, no civil court could issue a declaration validating such a divorce even if the talaqnama predated Shayara Bano."
          },
          {
            "type": "quote",
            "text": "The suit in question is also vexatious and frivolous piece of litigation seeking declaration on the basis of oral triple talaq and no such declaration can be granted as per law."
          },
          {
            "type": "p",
            "text": "Allowing the wife’s petitions, the High Court held that both the trial court and the Family Court should have invoked Order 7 Rule 11 CPC and rejected the plaint at the outset. Accordingly, the husband’s suit was dismissed."
          },
          {
            "type": "alsoRead",
            "text": "Assam’s Repeal of Muslim Marriage Law Sparks Controversy and Debate",
            "href": "https://lawchakra.in/legal-updates/assams-repeal-of-muslim-marriage-law/"
          },
          {
            "type": "h",
            "text": "Key Observations"
          },
          {
            "type": "ul",
            "items": [
              "Amendments to pleadings cannot substantially change the nature of the dispute or introduce an entirely new cause of action once trial has begun.",
              "Parties may pursue remedies under personal law, but courts cannot permit litigants to rewrite earlier pleadings to bypass constitutional rulings.",
              "Instant triple talaq allows unilateral termination of marriage without any possibility of reconciliation, making it arbitrary and legally unenforceable.",
              "The husband was granted liberty to seek divorce through any other legally recognised process available under Muslim personal law."
            ]
          },
          {
            "type": "p",
            "text": "Advocate Mukhtar Ahmad appeared for the petitioner-wife, while advocate Devendra Kumar Gangrade represented the respondent-husband."
          }
        ]
        """
    ),
    new SeedRow(
        Slug: "puttaswamy-vs-union-of-india",
        Kind: "judgement",
        Category: "CONSTITUTIONAL LAW",
        Title: "Justice K.S. Puttaswamy (Retd.) vs Union of India & Ors.",
        Subtitle: "A nine-judge Constitution Bench of the Supreme Court of India unanimously held that the Right to Privacy is a Fundamental Right guaranteed under Article 21 and Part III of the Constitution.",
        Author: "Advocate Disha Srivastava",
        PublishedOn: "2017-08-24",
        Image: "supreme_court",
        CaseTitle: "Justice K.S. Puttaswamy (Retd.) v. Union of India, (2017) 10 SCC 1",
        JudgmentUrl: "https://main.sci.gov.in/supremecourt/2012/35071/35071_2012_Judgement_24-Aug-2017.pdf",
        SourceUrl: null,
        BodyJson:
        """
        [
          {
            "type": "p",
            "text": "In a landmark decision, the Supreme Court of India recognised that the Right to Privacy is intrinsic to the Right to Life and Personal Liberty under Article 21 and is also protected as a part of the freedoms guaranteed by Part III of the Constitution."
          },
          {
            "type": "p",
            "text": "The judgment overruled earlier decisions in M.P. Sharma and Kharak Singh to the extent they held that privacy was not a fundamental right, and re-shaped Indian constitutional law for the digital age."
          },
          {
            "type": "alsoRead",
            "text": "Shayara Bano vs Union of India – Triple Talaq Declared Unconstitutional",
            "href": "/judgements/shayara-bano-vs-union-of-india"
          },
          {
            "type": "h",
            "text": "Key Holdings"
          },
          {
            "type": "ul",
            "items": [
              "Privacy is a constitutionally protected right which emerges primarily from Article 21.",
              "Informational privacy is a facet of the right to privacy.",
              "Any encroachment on privacy must satisfy legality, necessity and proportionality."
            ]
          },
          {
            "type": "quote",
            "text": "Privacy is the constitutional core of human dignity."
          },
          {
            "type": "p",
            "text": "The judgement laid the foundation for subsequent rulings on data protection, surveillance, decriminalisation of Section 377, and personal autonomy in matters of marriage and identity."
          }
        ]
        """
    ),
    new SeedRow(
        Slug: "shayara-bano-vs-union-of-india",
        Kind: "judgement",
        Category: "CONSTITUTIONAL LAW",
        Title: "Shayara Bano vs Union of India",
        Subtitle: "The Supreme Court held that the practice of instant triple talaq (Talaq-e-Biddat) is unconstitutional and violative of fundamental rights guaranteed under Part III of the Constitution.",
        Author: "Advocate Disha Srivastava",
        PublishedOn: "2017-08-22",
        Image: "judge_gavel",
        CaseTitle: "Shayara Bano v. Union of India, (2017) 9 SCC 1",
        JudgmentUrl: "https://main.sci.gov.in/supremecourt/2016/6716/6716_2016_Judgement_22-Aug-2017.pdf",
        SourceUrl: null,
        BodyJson:
        """
        [
          {
            "type": "p",
            "text": "By a 3:2 majority, the Supreme Court struck down the practice of instant triple talaq (Talaq-e-Biddat) as arbitrary and inconsistent with Article 14 of the Constitution."
          },
          {
            "type": "p",
            "text": "The Court reasoned that any practice which allows unilateral termination of marriage without any possibility of reconciliation is manifestly arbitrary and cannot be protected as an essential religious practice."
          },
          {
            "type": "alsoRead",
            "text": "Justice K.S. Puttaswamy vs Union of India – Right to Privacy",
            "href": "/judgements/puttaswamy-vs-union-of-india"
          },
          {
            "type": "h",
            "text": "Why this matters"
          },
          {
            "type": "ul",
            "items": [
              "Re-affirmed that personal laws must satisfy the test of constitutional morality.",
              "Paved the way for the Muslim Women (Protection of Rights on Marriage) Act, 2019.",
              "Strengthened equality jurisprudence under Article 14 in family law disputes."
            ]
          },
          {
            "type": "quote",
            "text": "What is held to be bad in the Holy Quran cannot be good in Shariat."
          }
        ]
        """
    ),
    new SeedRow(
        Slug: "indore-development-authority-vs-manoharlal",
        Kind: "judgement",
        Category: "CIVIL LAW",
        Title: "Indore Development Authority vs Manoharlal",
        Subtitle: "A Constitution Bench reiterated the principles of natural justice and fair hearing in administrative actions concerning land acquisition.",
        Author: "Advocate Disha Srivastava",
        PublishedOn: "2024-05-10",
        Image: "taj_building",
        CaseTitle: "Indore Development Authority v. Manoharlal & Ors., (2020) 8 SCC 129",
        JudgmentUrl: "https://main.sci.gov.in/",
        SourceUrl: null,
        BodyJson:
        """
        [
          {
            "type": "p",
            "text": "The Supreme Court clarified the law on lapse of land acquisition proceedings under Section 24(2) of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013."
          },
          {
            "type": "p",
            "text": "The judgement settled conflicting views on when acquisition proceedings would lapse and provided much-needed clarity on the meaning of \"paid\" and \"possession\"."
          },
          {
            "type": "h",
            "text": "Key Takeaways"
          },
          {
            "type": "ul",
            "items": [
              "Lapse under Section 24(2) is conjunctive — both possession and compensation conditions must be unfulfilled.",
              "Tender of compensation is sufficient compliance even if not actually paid.",
              "Possession is taken when a memorandum / panchnama is drawn up."
            ]
          }
        ]
        """
    ),
    new SeedRow(
        Slug: "supreme-court-bail-2024",
        Kind: "blog",
        Category: "SUPREME COURT",
        Title: "What the Supreme Court Said on Bail in 2024",
        Subtitle: "A practical summary of recent bail jurisprudence and how courts weigh liberty against the demands of investigation and trial.",
        Author: "Advocate Disha Srivastava",
        PublishedOn: "2024-05-15",
        Image: "supreme_court",
        CaseTitle: null,
        JudgmentUrl: null,
        SourceUrl: null,
        BodyJson:
        """
        [
          {
            "type": "p",
            "text": "In a string of decisions in 2024, the Supreme Court reiterated that bail is the rule and jail is the exception, particularly in matters involving prolonged incarceration without trial."
          },
          {
            "type": "alsoRead",
            "text": "Read: Justice K.S. Puttaswamy – Right to Privacy",
            "href": "/judgements/puttaswamy-vs-union-of-india"
          },
          {
            "type": "h",
            "text": "Factors Courts consider"
          },
          {
            "type": "ul",
            "items": [
              "Nature and gravity of the accusation.",
              "Severity of punishment if convicted.",
              "Risk of the accused absconding or tampering with evidence.",
              "Period already undergone in custody."
            ]
          },
          {
            "type": "quote",
            "text": "Liberty cannot be sacrificed at the altar of pendency."
          }
        ]
        """
    ),
    new SeedRow(
        Slug: "allahabad-hc-property-disputes",
        Kind: "blog",
        Category: "ALLAHABAD HIGH COURT",
        Title: "Allahabad HC on Property Disputes",
        Subtitle: "Key observations and legal principles from recent Allahabad High Court rulings on property and injunction matters.",
        Author: "Advocate Disha Srivastava",
        PublishedOn: "2024-05-12",
        Image: "taj_building",
        CaseTitle: null,
        JudgmentUrl: null,
        SourceUrl: null,
        BodyJson:
        """
        [
          {
            "type": "p",
            "text": "The Allahabad High Court has repeatedly emphasised that grant of temporary injunction is not a matter of right and must satisfy the classical three-fold test."
          },
          {
            "type": "h",
            "text": "Three-fold test"
          },
          {
            "type": "ul",
            "items": [
              "Prima facie case in favour of the applicant.",
              "Balance of convenience in favour of granting the relief.",
              "Irreparable injury if injunction is denied."
            ]
          }
        ]
        """
    ),
    new SeedRow(
        Slug: "understanding-article-21",
        Kind: "blog",
        Category: "CONSTITUTIONAL LAW",
        Title: "Understanding Article 21 – Right to Dignity",
        Subtitle: "From Maneka Gandhi to modern privacy jurisprudence — a walk through what Article 21 protects in practice.",
        Author: "Advocate Disha Srivastava",
        PublishedOn: "2024-05-02",
        Image: "hero_statue",
        CaseTitle: null,
        JudgmentUrl: null,
        SourceUrl: null,
        BodyJson:
        """
        [
          {
            "type": "p",
            "text": "Article 21 of the Constitution guarantees that no person shall be deprived of his life or personal liberty except according to procedure established by law. Its scope has been expanded dramatically by judicial interpretation."
          },
          {
            "type": "h",
            "text": "Rights read into Article 21"
          },
          {
            "type": "ul",
            "items": [
              "Right to live with dignity.",
              "Right to privacy.",
              "Right to a speedy trial.",
              "Right to clean environment.",
              "Right to legal aid."
            ]
          }
        ]
        """
    ),
    new SeedRow(
        Slug: "what-is-habeas-corpus",
        Kind: "blog",
        Category: "LEGAL EXPLAINER",
        Title: "What is Habeas Corpus?",
        Subtitle: "A simple explanation of one of the most powerful writs in Indian constitutional law.",
        Author: "Advocate Disha Srivastava",
        PublishedOn: "2024-05-06",
        Image: "blog_writing",
        CaseTitle: null,
        JudgmentUrl: null,
        SourceUrl: null,
        BodyJson:
        """
        [
          {
            "type": "p",
            "text": "Habeas Corpus literally means \"you may have the body.\" It is a writ issued by a constitutional court directing a person who has detained another to produce the detenu before the court."
          },
          {
            "type": "p",
            "text": "Available under Articles 32 and 226 of the Constitution, it is a powerful safeguard against illegal detention by the State or any private party."
          }
        ]
        """
    )
];

static string NormalizeDate(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var dt))
    {
        return dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    return value;
}

static string Slugify(string value)
{
    var input = (value ?? string.Empty).Trim().ToLowerInvariant();
    var chars = input.Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray();
    var slug = new string(chars);

    while (slug.Contains("--", StringComparison.Ordinal))
    {
        slug = slug.Replace("--", "-", StringComparison.Ordinal);
    }

    slug = slug.Trim('-');

    return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("n") : slug;
}

static string CreateJwtToken(string jwtKey, string jwtIssuer, string jwtAudience, long userId, string email, string? name)
{
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var claims = new List<Claim>
    {
        new(JwtRegisteredClaimNames.Sub, userId.ToString(CultureInfo.InvariantCulture)),
        new(JwtRegisteredClaimNames.Email, email)
    };

    if (!string.IsNullOrWhiteSpace(name))
    {
        claims.Add(new Claim(JwtRegisteredClaimNames.Name, name));
    }

    var token = new JwtSecurityToken(
        issuer: jwtIssuer,
        audience: jwtAudience,
        claims: claims,
        expires: DateTime.UtcNow.AddDays(14),
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}

public record JudgementListItemDto(string slug, string tag, string title, string desc, string date, bool isLive = true, string author = "", long views = 0);

public record JudgementDetailDto(
    string slug,
    string category,
    string title,
    string subtitle,
    string author,
    string date,
    string image,
    string? caseTitle,
    string? judgmentUrl,
    string? sourceUrl,
    JsonElement body,
    long views = 0
)
{
    public string kind => "judgement";
}

public record BlogDetailDto(
    string slug,
    string category,
    string title,
    string subtitle,
    string author,
    string date,
    string image,
    JsonElement body,
    long views = 0
)
{
    public string kind => "blog";
}

public record JudgementCreateDto(
    string? slug,
    string? category,
    string? title,
    string? subtitle,
    string? author,
    string? publishedOn,
    string? image,
    string? caseTitle,
    string? judgmentUrl,
    string? sourceUrl,
    JsonElement body
);

public sealed class UserForHashing { }

public record SignupDto(string? email, string? password, string? name);

public record LoginDto(string? email, string? password);

public record GoogleLoginDto(string? idToken);

public record UserDto(long id, string email, string? name);

public record AuthResponseDto(string token, UserDto user);

public record CommentDto(long id, string authorName, string body, string createdAt);

public record CommentCreateDto(string? authorName, string? body, string? kind);

public record LikeDto(string? sessionId, string? kind);

public record ContactInquiryCreateDto(
    string? name,
    string? email,
    string? phone,
    string? subject,
    string? message
);

public record ContactInquiryDto(
    int id,
    string name,
    string email,
    string? phone,
    string subject,
    string message,
    string submittedAt
);

file sealed record SeedRow(
    string Slug,
    string Kind,
    string Category,
    string Title,
    string Subtitle,
    string Author,
    string PublishedOn,
    string Image,
    string? CaseTitle,
    string? JudgmentUrl,
    string? SourceUrl,
    string BodyJson
);
