export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  NameSetup: {
    initialName?: string;
  };
  PartnerCode: undefined;
  MainTabs: undefined;
};

export type MainStackParamList = {
  TasksTab: undefined;
  CoreTab: undefined;
  SettingsTab: undefined;
};

export type TasksStackParamList = {
  TasksList: undefined;
  TaskCreate: undefined;
  TaskEdit: { taskId: string };
};

export type CoreStackParamList = {
  CoreHome: undefined;
  Notes: undefined;
  CreateNote: { noteId?: string };
  Reflections: { weeklyPrompt?: string };
}; 