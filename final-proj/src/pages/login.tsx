import React, { useState } from 'react';

export default function Login() {

    const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);
    setSuccess(null);

//     async function ensureAuthAndGreet() {
//   try {
//     const meLog = await fetch("/api/me")
//     if (!meLog.ok) {
//       window.location.href = "/login"
//       return null
//     }
//     const me = await meLog.json()
//     const welcome = document.getElementById("welcome")
//     if (welcome) welcome.textContent = `Welcome, ${me.name}!`
//     return me
//   } catch (err) {
//     console.error("Error checking auth oh no!!!", err)
//     window.location.href = "/login"
//     return null
//   }
// }

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.created) {
          setSuccess(data.message || 'Account created! Signing you in...');
          setTimeout(() => {
            window.location.href = '/';
          }, 900);
        } else {
          window.location.href = '/';
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error(errData.error || 'Invalid email or password!');
      }
    } catch (err) {
      console.error('Login request failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-light">
      <div className="container min-vh-100 d-flex align-items-center">
        <div className="row w-100 justify-content-center">
          <div className="col-5 col-sm-8 col-md-10 col-lg-12">
            <div className="card shadow-sm">
              <div className="card-body p-4 p-sm-5">
                <h1 className="h3 mb-3 text-center">Sign in</h1>
                <p className="text-secondary text-center mb-4">
                  Use email and password to login/create an account or continue with GitHub.
                </p>

                {success && <div className="alert alert-success">{success}</div>}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="form-control"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className="form-control"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>
                
                <div className="d-flex align-items-center my-4">
                  <hr className="flex-grow-1" />
                  <span className="px-2 text-secondary">or</span>
                  <hr className="flex-grow-1" />
                </div>
                
                <a className="btn btn-dark w-100" href="/auth/github" role="button">
                  Continue with GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}