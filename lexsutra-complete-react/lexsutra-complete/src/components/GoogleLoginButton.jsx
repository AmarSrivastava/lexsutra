import { useEffect, useRef } from "react";

function loadGsiScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function GoogleLoginButton({ onCredential }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled) return;
        if (!containerRef.current) return;

        const google = window.google;
        if (!google?.accounts?.id) return;

        containerRef.current.innerHTML = "";

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) return;
            onCredential?.(response.credential);
          },
        });

        google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320,
        });
      })
      .catch(() => {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }

  return <div ref={containerRef} />;
}
