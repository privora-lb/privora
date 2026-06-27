import {
  Building2,
  CalendarDays,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/login/actions";
import { PasswordInput } from "@/components/ui/password-input";
import { getCurrentUser } from "@/lib/auth";

const inputClassName =
  "h-12 w-full min-w-0 rounded-2xl border border-[#c9e5eb] bg-white px-11 text-sm font-bold text-slate-950 outline-none shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition placeholder:text-slate-400 focus:border-[#007c92] focus:ring-4 focus:ring-[#007c92]/10";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/calendar");
  }

  const params = await searchParams;
  const hasError = params.error === "invalid";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef5f6] px-3 py-4 text-slate-950 sm:px-6 sm:py-6 lg:grid lg:place-items-center lg:py-10">
      <section className="mx-auto grid w-full max-w-md overflow-hidden rounded-[24px] border border-[#c6e9ef] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:max-w-xl lg:max-w-5xl lg:grid-cols-[0.9fr_1.1fr] lg:rounded-[28px]">
        <div className="min-w-0 bg-[#123342] p-4 text-white sm:p-7 lg:p-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e2f7fb] text-[#007c92] shadow-[0_12px_26px_rgba(0,0,0,0.16)] sm:h-12 sm:w-12">
              <Building2 size={21} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-[#9bdded] sm:text-[11px] sm:tracking-[0.18em]">
                Internal access
              </p>
              <h1 className="m-0 mt-1 break-words text-[22px] font-black leading-tight sm:text-2xl lg:text-xl">
                Reservation Tracking
              </h1>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/12 bg-[#0e4050] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:mt-8 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#9bdded]">
                <ShieldCheck size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="m-0 text-base font-black leading-tight sm:text-lg">
                  Secure workspace
                </h2>
                <p className="m-0 mt-2 text-sm font-semibold leading-6 text-[#d9f6fa]">
                  Sign in with your account identifier and password.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 rounded-3xl border border-white/12 bg-white/8 p-3 text-sm sm:mt-5 sm:p-4">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-[#9bdded] sm:text-[11px] sm:tracking-[0.16em]">
              Demo credentials
            </p>
            <DemoCredential label="Admin" value="admin@example.com / admin123" />
            <DemoCredential label="Owner" value="Maya Haddad / owner123" />
            <DemoCredential label="Owner" value="karim@example.com / owner123" />
          </div>
        </div>

        <div className="min-w-0 p-4 sm:p-7 lg:p-9">
          <div className="mx-auto max-w-md">
            <div className="mb-5 sm:mb-7">
              <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-[#007c92] sm:text-[11px] sm:tracking-[0.18em]">
                Welcome back
              </p>
              <h2 className="m-0 mt-2 text-[34px] font-black leading-none text-slate-950 sm:text-3xl">
                Sign in
              </h2>
              <p className="m-0 mt-2 text-sm font-semibold leading-6 text-slate-500">
                Use your email, phone number, or name.
              </p>
            </div>

            {hasError ? (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                Invalid login or password.
              </div>
            ) : null}

            <form action={loginAction} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 sm:text-[12px] sm:tracking-[0.12em]">
                  Email, phone, or name
                </span>
                <span className="relative block">
                  <UserRound
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#007c92]"
                    size={17}
                  />
                  <input
                    className={inputClassName}
                    name="identifier"
                    placeholder="admin@example.com, phone, or Maya Haddad"
                    type="text"
                    required
                  />
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 sm:text-[12px] sm:tracking-[0.12em]">
                  Password
                </span>
                <PasswordInput
                  buttonClassName="right-2.5 h-8 w-8 rounded-xl text-[#0b6f7d] hover:bg-[#eefbfc] hover:text-[#0b4658]"
                  className={`${inputClassName} pr-12`}
                  name="password"
                  placeholder="Enter password"
                  required
                />
              </label>

              <button
                className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#007c92] px-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(0,124,146,0.2)] transition hover:-translate-y-px hover:bg-[#07586c] focus:outline-none focus:ring-4 focus:ring-[#007c92]/18"
                type="submit"
              >
                <LockKeyhole size={17} aria-hidden="true" />
                Sign in
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#d8e9ee] bg-[#f8fcfd] px-4 py-3 text-sm font-bold text-slate-600">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e2f7fb] text-[#007c92]">
                <CalendarDays size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                Access is limited to active users and active assigned venues.
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function DemoCredential({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-2xl bg-white/8 px-3 py-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#9bdded] sm:text-xs">
        {label}
      </span>
      <span className="min-w-0 break-all text-sm font-bold leading-5 text-white sm:truncate sm:text-right">
        {value}
      </span>
    </div>
  );
}
