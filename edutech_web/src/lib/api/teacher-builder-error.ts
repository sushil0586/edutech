export class TeacherBuilderApiError extends Error {
  status: number;
  payload: Record<string, unknown> | null;

  constructor(
    message: string,
    options: {
      status: number;
      payload?: Record<string, unknown> | null;
    },
  ) {
    super(message);
    this.name = "TeacherBuilderApiError";
    this.status = options.status;
    this.payload = options.payload ?? null;
  }
}
