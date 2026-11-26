import { SocialLoginButton } from "@/components/prestigeui/social-login-button";

export default function SocialLoginButtonDemo() {
  return (
    <div className="flex w-72 flex-col gap-3">
      <SocialLoginButton provider="google" />
      <SocialLoginButton provider="apple" />
      <SocialLoginButton provider="github" />
    </div>
  );
}
