import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-4xl">声</span>
          <h1 className="mt-2 text-2xl font-bold">Start your JLPT journey</h1>
          <p className="text-muted">Create an account to begin studying</p>
        </div>
        <SignUp
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
