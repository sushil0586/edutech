export type ProfileCompletionActionState = {
  message: string;
  role: string;
  fieldErrors: Partial<
    Record<
      | "phone"
      | "school_code"
      | "class_level"
      | "board"
      | "exam_interest"
      | "subject_interests"
      | "child_class_level"
      | "child_board"
      | "parent_focus"
      | "teaching_focus"
      | "teaching_scope"
      | "country"
      | "state"
      | "city"
      | "pincode"
      | "timezone",
      string
    >
  >;
};

export const initialProfileCompletionActionState: ProfileCompletionActionState = {
  message: "",
  role: "",
  fieldErrors: {},
};
