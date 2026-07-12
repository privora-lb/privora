import {
  CalendarDays,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/login/actions";
import { PasswordInput } from "@/components/ui/password-input";
import { getCurrentUser } from "@/lib/auth";
import privoraProfilePicture from "../../../privora-profile-picture.jpg.jpeg";

const inputClassName =
  "h-12 w-full min-w-0 rounded-2xl border border-[#EACC84]/45 bg-white px-11 text-sm font-bold text-slate-950 outline-none shadow-[0_10px_24px_rgba(18,60,54,0.06)] transition placeholder:text-slate-400 focus:border-[#C0964E] focus:ring-4 focus:ring-[#EACC84]/20";

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
    <main className="min-h-screen overflow-x-hidden bg-[#f4f2ea] px-3 py-4 text-slate-950 sm:px-6 sm:py-6 lg:grid lg:place-items-center lg:py-10">
      <div className="w-full">
      <section className="mx-auto grid w-full max-w-md overflow-hidden rounded-[24px] border border-[#EACC84]/45 bg-white shadow-[0_24px_70px_rgba(18,60,54,0.16)] sm:max-w-xl lg:max-w-5xl lg:grid-cols-[0.9fr_1.1fr] lg:rounded-[28px]">
        <div className="flex min-w-0 items-center justify-center bg-[#123C36] p-4 text-[#FCFCF0] sm:p-7 lg:p-8">
          <div className="flex w-full items-center justify-center bg-[#123C36]">
            <Image
              alt="Privora"
              className="mx-auto h-auto w-full max-w-[260px] rounded-none sm:max-w-[300px] lg:max-w-[320px]"
              priority
              sizes="(min-width: 1024px) 320px, 80vw"
              src={privoraProfilePicture}
            />
          </div>
        </div>

        <div className="min-w-0 p-4 sm:p-7 lg:p-9">
          <div className="mx-auto max-w-md">
            <div className="mb-5 sm:mb-7">
              <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-[#967230] sm:text-[11px] sm:tracking-[0.18em]">
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
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#967230]"
                    size={17}
                  />
                  <input
                    className={inputClassName}
                    name="identifier"
                    placeholder="owner@example.com or 71234567"
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
                  buttonClassName="right-2.5 h-8 w-8 rounded-xl text-[#967230] hover:bg-[#FCF7E8] hover:text-[#123C36]"
                  className={`${inputClassName} pr-12`}
                  name="password"
                  placeholder="Enter password"
                  required
                />
              </label>

              <button
                className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#C0964E] px-4 text-sm font-black text-[#123C36] shadow-[0_16px_32px_rgba(192,150,78,0.22)] transition hover:-translate-y-px hover:bg-[#A87E36] focus:outline-none focus:ring-4 focus:ring-[#EACC84]/30"
                type="submit"
              >
                <LockKeyhole size={17} aria-hidden="true" />
                Sign in
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#EACC84]/35 bg-[#FCFCF0] px-4 py-3 text-sm font-bold text-slate-600">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F6E4AE] text-[#123C36]">
                <CalendarDays size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                Access is limited to active users and active assigned venues.
              </span>
            </div>
          </div>
        </div>
      </section>

      </div>
    </main>
  );
}
