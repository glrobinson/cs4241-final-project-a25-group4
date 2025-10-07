async function ensureAuthAndGreet() {
  try {
    const meLog = await fetch("/api/me")
    if (!meLog.ok) {
      window.location.href = "/login"
      return null
    }
    const me = await meLog.json()
    const welcome = document.getElementById("welcome")
    if (welcome) welcome.textContent = `Welcome, ${me.name}!`
    return me
  } catch (err) {
    console.error("Error checking auth oh no!!!", err)
    window.location.href = "/login"
    return null
  }
}

const loginForm = document.getElementById("loginForm")
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const form = e.target
    const payload = { email: form.email.value, password: form.password.value }
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.created) {
          const check = document.getElementById("ok")
          if (check) {
            check.textContent = data.message || "The account has been created so you are now being signed in!"
            check.classList.remove("d-none")
          }
          setTimeout(() => { window.location.href = "/" }, 900)
        } else {
          window.location.href = "/"
        }
      } else {
        const err = await res.json().catch(() => ({}))
        const errMsg = document.getElementById("err")
        if (errMsg) {
          errMsg.textContent = err.error || "Invalid email or password!"
          errMsg.classList.remove("d-none")
          errMsg.style.display = "block"
        }
      }
    } catch (err) {
      console.error("Login request failed", err)
      const errMsg = document.getElementById("err")
      if (errMsg) {
        errMsg.textContent = "Oops! Something went wrong please try again"
        errMsg.classList.remove("d-none")
        errMsg.style.display = "block"
      }
    }
  })
}