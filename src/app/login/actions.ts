"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";
import { addToastToPath, getFormString } from "@/lib/forms";

export async function loginAction(formData: FormData) {
  const identifier = getFormString(formData, "identifier");
  const password = getFormString(formData, "password");
  const user = await signIn(identifier, password);

  if (!user) {
    redirect(
      addToastToPath("/login?error=invalid", {
        message: "Invalid login or password.",
        type: "error",
      }),
    );
  }

  redirect("/calendar");
}
