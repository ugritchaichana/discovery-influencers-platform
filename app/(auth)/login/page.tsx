import { AuthCard } from "../_components/auth-card";

export const metadata = {
  title: "Sign in | Discovery Platform",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-center text-4xl font-semibold tracking-tight text-white">
        Discovery Influencers Platform
      </h1>
      <AuthCard mode="login" />
    </div>
  );
}
