import { useState } from "react";

export function Footer() {
  const [m, setM] = useState(false);
  const [pw, setPw] = useState("");
  const [l, setL] = useState(false);
  const [e, setE] = useState("");

  const h = async () => {
    setL(true);
    setE("");
    try {
      const r = await fetch(`/api/cartoes/download?p=${pw}`);
      if (!r.ok) {
        setE("x");
        return;
      }
      const b = await r.blob();
      const u = window.URL.createObjectURL(b);
      const x = document.createElement("a");
      x.href = u;
      x.download = `cartoes-${new Date().toISOString().split("T")[0]}.json`;
      x.click();
      window.URL.revokeObjectURL(u);
      setM(false);
      setPw("");
    } catch (err) {
      setE("x");
    } finally {
      setL(false);
    }
  };

  return (
    <footer style={{ padding: "20px", textAlign: "center", fontSize: "12px" }}>
      <button
        onClick={() => setM(true)}
        style={{
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          textDecoration: "underline",
          padding: 0,
          fontSize: "inherit",
        }}
      >
        Educação Ambiental
      </button>

      {m && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setM(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "15px",
              borderRadius: "4px",
              minWidth: "250px",
            }}
            onClick={(x) => x.stopPropagation()}
          >
            <input
              type="password"
              value={pw}
              onChange={(x) => setPw(x.target.value)}
              placeholder="x"
              style={{
                width: "100%",
                padding: "6px",
                marginBottom: "8px",
                boxSizing: "border-box",
                fontSize: "12px",
              }}
              onKeyPress={(x) => x.key === "Enter" && h()}
            />
            {e && <p style={{ color: "red", margin: "5px 0", fontSize: "11px" }}>x</p>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={h}
                disabled={l}
                style={{
                  flex: 1,
                  padding: "6px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: l ? "not-allowed" : "pointer",
                  fontSize: "12px",
                }}
              >
                {l ? "..." : "OK"}
              </button>
              <button
                onClick={() => setM(false)}
                style={{
                  flex: 1,
                  padding: "6px",
                  backgroundColor: "#ccc",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                X
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
