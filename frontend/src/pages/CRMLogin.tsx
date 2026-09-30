import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { FaArrowRight, FaEnvelope, FaEye, FaEyeSlash, FaLeaf, FaLock } from "react-icons/fa";
import { auth } from "../../firebase";
import logo from "../assets/logo.jpg";
import heroImage from "../assets/hero/hero-1.jpg";
import "./CRMLogin.css";

type LoginLocationState = {
  from?: string;
};

export function CRMLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [user, authLoading] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as LoginLocationState | null)?.from ?? "/CRM";

  if (!authLoading && user) {
    return <Navigate to="/CRM" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha para continuar.");
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate(destination.startsWith("/CRM") ? destination : "/CRM", { replace: true });
    } catch {
      setError("E-mail ou senha inválidos. Confira os dados e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="crm-login" id="conteudo-principal" tabIndex={-1}>
      <section
        className="crm-login__story"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(4, 38, 48, .18), rgba(4, 28, 31, .82)), url(${heroImage})` }}
      >
        <div className="crm-login__story-top">
          <span className="crm-login__eyebrow"><FaLeaf aria-hidden="true" /> CRM Vagafogo</span>
        </div>
        <div className="crm-login__story-copy">
          <p>Gestão que aproxima</p>
          <h1>Mais vida em cada relacionamento.</h1>
          <span>Reservas, clientes e oportunidades reunidos em um só lugar.</span>
        </div>
      </section>

      <section className="crm-login__form-panel" aria-labelledby="crm-login-title">
        <div className="crm-login__form-wrap">
          <div className="crm-login__brand">
            <img src={logo} alt="Santuário Vagafogo" />
            <div>
              <strong>Vagafogo</strong>
              <span>Santuário de Vida Silvestre</span>
            </div>
          </div>

          <div className="crm-login__heading">
            <span className="crm-login__kicker">Área administrativa</span>
            <h2 id="crm-login-title">Bem-vindo ao CRM</h2>
            <p>Entre com suas credenciais para acessar a gestão comercial.</p>
          </div>

          <form onSubmit={handleSubmit} className="crm-login__form" noValidate>
            {error ? <div className="crm-login__error" role="alert">{error}</div> : null}

            <label htmlFor="crm-email">E-mail</label>
            <div className="crm-login__field">
              <FaEnvelope aria-hidden="true" />
              <input
                id="crm-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="administrador@vagafogo.com.br"
                autoComplete="username"
                autoFocus
              />
            </div>

            <label htmlFor="crm-password">Senha</label>
            <div className="crm-login__field">
              <FaLock aria-hidden="true" />
              <input
                id="crm-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="crm-login__reveal"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button className="crm-login__submit" type="submit" disabled={submitting || authLoading}>
              <span>{submitting ? "Entrando..." : "Entrar no CRM"}</span>
              {!submitting ? <FaArrowRight aria-hidden="true" /> : <span className="crm-login__spinner" aria-hidden="true" />}
            </button>
          </form>

          <p className="crm-login__security"><FaLock aria-hidden="true" /> Acesso seguro e restrito à equipe Vagafogo</p>
        </div>
      </section>
    </main>
  );
}

