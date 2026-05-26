CREATE TABLE IF NOT EXISTS Judgements (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Slug TEXT NOT NULL UNIQUE,
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

CREATE INDEX IF NOT EXISTS IX_Judgements_PublishedOn ON Judgements(PublishedOn);
