import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-4xl">声</span>
          <h1 className="mt-2 text-2xl font-bold">Welcome back</h1>
          <p className="text-muted">Sign in to continue your JLPT study</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none border border-border",
            },
          }}
        />
      </div>
    </div>
  );
}
