export type LoginActionState = {
  message: string;
  username: string;
  fieldErrors: {
    username?: string;
    password?: string;
  };
};

export const initialLoginActionState: LoginActionState = {
  message: "",
  username: "",
  fieldErrors: {},
};
