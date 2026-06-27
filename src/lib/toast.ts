export const toastTypeParam = "toast";
export const toastMessageParam = "toastMessage";
export const toastIdParam = "toastId";

export type ActionToast = {
  message: string;
  type: "error" | "success";
};
