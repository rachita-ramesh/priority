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
  SettingsTab: undefined;
};

export type TasksStackParamList = {
  TasksList: undefined;
  TaskCreate: undefined;
  TaskEdit: { taskId: string };
}; 