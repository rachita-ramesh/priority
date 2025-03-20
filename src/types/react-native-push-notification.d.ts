declare module 'react-native-push-notification' {
  export interface PushNotificationPermissions {
    alert?: boolean;
    badge?: boolean;
    sound?: boolean;
  }

  export interface PushNotificationOptions {
    onRegister?: Function;
    onNotification?: Function;
    onAction?: Function;
    onRegistrationError?: Function;
    onRemoteFetch?: Function;
    permissions?: PushNotificationPermissions;
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
    senderID?: string;
  }

  export interface PushNotificationChannel {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    playSound?: boolean;
    soundName?: string;
    importance?: number;
    vibrate?: boolean;
  }

  export interface PushNotificationObject {
    id?: string;
    channelId?: string;
    title?: string;
    message: string;
    date?: Date;
    userInfo?: any;
    body?: string;
    data?: any;
    foreground?: boolean;
    userInteraction?: boolean;
    [key: string]: any;
  }

  export interface PushNotificationScheduleObject extends PushNotificationObject {
    date: Date;
    allowWhileIdle?: boolean;
    repeats?: boolean;
    repeatType?: 'day' | 'week' | 'month' | 'year';
  }

  export default class PushNotification {
    static configure(options: PushNotificationOptions): void;
    static localNotification(details: PushNotificationObject): void;
    static localNotificationSchedule(details: PushNotificationScheduleObject): void;
    static cancelLocalNotification(id: string): void;
    static cancelAllLocalNotifications(): void;
    static createChannel(channel: PushNotificationChannel, callback: (created: boolean) => void): void;
    static requestPermissions(permissions?: PushNotificationPermissions): Promise<PushNotificationPermissions>;
    static checkPermissions(callback: (permissions: PushNotificationPermissions) => void): void;
  }
}

declare module '@react-native-community/push-notification-ios' {
  export enum FetchResult {
    NoData = 0,
    NewData = 1,
    Failed = 2,
  }

  export interface PushNotificationPermissions {
    alert?: boolean;
    badge?: boolean;
    sound?: boolean;
    critical?: boolean;
    lockScreen?: boolean;
    notificationCenter?: boolean;
    provisional?: boolean;
  }

  export interface PushNotificationIOS {
    requestPermissions(permissions?: PushNotificationPermissions): Promise<PushNotificationPermissions>;
    finish(fetchResult: FetchResult): void;
  }

  const PushNotificationIOS: PushNotificationIOS;
  export default PushNotificationIOS;
} 