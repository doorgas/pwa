// ✅ 2. app/auth/page.tsx
"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

   

    setLoading(false);

    if (res?.error) {
      console.log("Login error:", res.error); // 🔍 Add this line for debug
      try {
        const parsed = JSON.parse(res.error);
        switch (parsed.code) {
          case "MISSING_CREDENTIALS":
            setErrorMsg("Please enter both email and password.");
            break;
          case "USER_NOT_FOUND":
            setErrorMsg("No user found with this email.");
            break;
          case "INVALID_PASSWORD":
            setErrorMsg("Incorrect password.");
            break;
          default:
            setErrorMsg("Something went wrong.");
        }
      } catch {
        setErrorMsg("An unexpected error occurred.");
      }
    } else if (res?.ok) {
      router.push("/");
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>

        {errorMsg && (
          <div className="mb-4 text-sm text-red-600 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border px-3 py-2 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border px-3 py-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}