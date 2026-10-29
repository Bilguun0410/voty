"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import OtpInput from "./otp-input";

const CODE_LENGTH = 6;

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function join(value: string) {
    if (value.length === CODE_LENGTH) router.push(`/polls/${value}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight">Enter vote code</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          join(code);
        }}
        className="flex flex-col gap-4"
      >
        <OtpInput length={CODE_LENGTH} value={code} onChange={setCode} onComplete={join} />
        <button
          type="submit"
          disabled={code.length < CODE_LENGTH}
          className="rounded-lg bg-foreground px-4 py-3 font-medium text-background disabled:opacity-50"
        >
          Join
        </button>
      </form>
    </main>
  );
}
