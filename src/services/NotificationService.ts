import PushNotification from 'react-native-push-notification';
import PushNotificationIOS, { FetchResult } from '@react-native-community/push-notification-ios';
import { Platform, NativeEventEmitter, NativeModule } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for our notification system
type Task = {
  id: string;
  title: string;
  due_date: string;
  assignee_id: string;
  creator_id: string;
  is_shared: boolean;
  status: 'pending' | 'completed';
};

type NotificationData = {
  taskId: string;
  notificationId: string;
  type: 'due_date' | 'new_assignment';
  scheduledTime: number;
};

interface NotificationToken {
  os: string;
  token: string;
}

interface PushNotificationObject {
  foreground: boolean;
  userInteraction: boolean;
  message: string;
  data: any;
  [key: string]: any;
}

class NotificationService {
  private static instance: NotificationService;
  private notificationSubscription: any = null;
  private userId: string | null = null;
  private partnerName: string | null = null;

  // Singleton pattern
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize the notification service
  initialize(userId: string, partnerName?: string): void {
    this.userId = userId;
    this.partnerName = partnerName || 'Your partner';
    
    // Configure notifications
    this.configureNotifications();
    
    // Request permissions
    this.requestPermissions();
  }

  // Configure push notifications
  private configureNotifications(): void {
    // Safely configure PushNotification
    try {
      PushNotification.configure({
        // (optional) Called when Token is generated
        onRegister: function(token: NotificationToken) {
          console.log('TOKEN:', token);
        },

        // (required) Called when a remote notification is received or opened
        onNotification: (notification: PushNotificationObject) => {
          console.log('NOTIFICATION:', notification);

          // Required for iOS
          if (Platform.OS === 'ios' && PushNotificationIOS) {
            notification.finish(FetchResult.NoData);
          }
        },

        // Android only: GCM or FCM Sender ID
        senderID: '1234567890',

        // iOS only: Allow notifications to be displayed in foreground
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        // Should notifications be displayed in foreground
        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios', // Only request on iOS automatically
      });

      // Create notification channels for Android
      if (Platform.OS === 'android') {
        this.createNotificationChannels();
      }
    } catch (error) {
      console.error('Error configuring push notifications:', error);
    }
  }

  // Create notification channels (Android only)
  private createNotificationChannels(): void {
    try {
      PushNotification.createChannel(
        {
          channelId: 'due-date-reminders',
          channelName: 'Due Date Reminders',
          channelDescription: 'Notifications for tasks with upcoming due dates',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created: boolean) => console.log(`Due date channel created: ${created}`)
      );

      PushNotification.createChannel(
        {
          channelId: 'new-assignments',
          channelName: 'New Task Assignments',
          channelDescription: 'Notifications for new tasks assigned to you',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created: boolean) => console.log(`New assignments channel created: ${created}`)
      );
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }

  // Request notification permissions
  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios' && PushNotificationIOS) {
        const authStatus = await PushNotificationIOS.requestPermissions();
        // Check if alert permission is granted
        return Boolean(authStatus.alert);
      } else if (Platform.OS === 'android') {
        // On Android, we need to handle this differently
        await PushNotification.requestPermissions();
        return true; // Android permissions are typically granted at app install time
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Schedule a notification for an upcoming due date
  async scheduleDueDateReminder(task: Task, testMode = false): Promise<string | null> {
    if (!this.userId || this.userId !== task.assignee_id) {
      // Only schedule reminders for tasks assigned to the current user
      return null;
    }

    try {
      // Parse due date
      const dueDate = new Date(task.due_date);
      console.log(`Scheduling reminder check for task ${task.id} - "${task.title}" with due date ${dueDate.toISOString()}`);
      
      // Calculate times for the reminders
      let reminderTimes: Date[] = [];
      
      if (testMode) {
        // In test mode, set the reminder to 2 minutes from now
        const testReminderTime = new Date();
        testReminderTime.setMinutes(testReminderTime.getMinutes() + 2);
        reminderTimes.push(testReminderTime);
        console.log(`📱 TEST MODE: Setting reminder to 2 minutes from now`);
      } else {
        // Normal mode: 24 hours and 12 hours before due date
        const reminder24h = new Date(dueDate);
        reminder24h.setHours(reminder24h.getHours() - 24);
        
        const reminder12h = new Date(dueDate);
        reminder12h.setHours(reminder12h.getHours() - 12);
        
        reminderTimes.push(reminder24h, reminder12h);
      }
      
      const now = new Date();
      
      // Format dates for readable logging
      const formattedNow = now.toLocaleString();
      const formattedDueDate = dueDate.toLocaleString();
      
      console.log(`📅 NOTIFICATION TEST INFO:`);
      console.log(`📱 Current time: ${formattedNow}`);
      console.log(`⏰ Task due date: ${formattedDueDate}`);
      
      // In test mode, skip the past-date check
      if (!testMode) {
        // Use date comparison that ignores timezone issues
        const isPastDue = dueDate.getTime() <= now.getTime();
        
        // Don't schedule if the due date is in the past
        if (isPastDue) {
          console.log(`❌ Not scheduling reminder for task ${task.id} - due date is in the past`);
          return null;
        }
      }

      let scheduledNotifications: NotificationData[] = [];

      // Schedule notifications for each reminder time
      for (const reminderTime of reminderTimes) {
        // Skip if reminder time is in the past
        if (!testMode && reminderTime.getTime() <= now.getTime()) {
          console.log(`Skipping reminder at ${reminderTime.toLocaleString()} - time already passed`);
          continue;
        }

        const formattedReminderTime = reminderTime.toLocaleString();
        console.log(`🔔 Scheduling reminder for: ${formattedReminderTime}`);

        // Generate a unique ID for the notification
        const hoursUntilDue = Math.round((dueDate.getTime() - reminderTime.getTime()) / (1000 * 60 * 60));
        const notificationId = `due-${task.id}-${hoursUntilDue}h`;
        
        // Calculate milliseconds until reminder time
        const msUntilReminder = reminderTime.getTime() - now.getTime();
        const minutesUntilReminder = Math.round(msUntilReminder / (1000 * 60));
        console.log(`📲 Notification will appear in approximately ${minutesUntilReminder} minutes`);

        // Schedule the notification
        PushNotification.localNotificationSchedule({
          id: notificationId,
          channelId: 'due-date-reminders',
          title: 'Priority Reminder',
          message: `${task.title} due in ${hoursUntilDue} hours`,
          date: reminderTime,
          allowWhileIdle: true,
          userInfo: {
            taskId: task.id,
            type: 'due_date',
            hoursUntilDue
          },
        });

        scheduledNotifications.push({
          taskId: task.id,
          notificationId,
          type: 'due_date' as const,
          scheduledTime: reminderTime.getTime(),
        });
      }

      // Store notification data in AsyncStorage
      for (const notification of scheduledNotifications) {
        await this.storeNotificationData(notification);
      }

      return scheduledNotifications[0]?.notificationId || null;
    } catch (error) {
      console.error('Error scheduling due date reminder:', error);
      return null;
    }
  }

  // Listen for new task assignments in real-time
  startListeningForNewAssignments(): void {
    if (!this.userId) {
      console.error('User ID not set, cannot listen for new assignments');
      return;
    }

    // First, unsubscribe from any existing subscription
    this.stopListeningForNewAssignments();

    // Subscribe to INSERT events on the priorities table where assignee_id = current user
    this.notificationSubscription = supabase
      .channel('new-task-assignments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'priorities',
          filter: `assignee_id=eq.${this.userId}`,
        },
        (payload) => {
          const newTask = payload.new as Task;
          
          // Check if the task was created by someone else (partner)
          if (newTask.creator_id !== this.userId) {
            this.sendNewAssignmentNotification(newTask);
          }
        }
      )
      .subscribe();

    console.log('Started listening for new task assignments');
  }

  // Stop listening for new assignments
  stopListeningForNewAssignments(): void {
    if (this.notificationSubscription) {
      supabase.removeChannel(this.notificationSubscription);
      this.notificationSubscription = null;
      console.log('Stopped listening for new task assignments');
    }
  }

  // Send a notification for a new task assignment
  private sendNewAssignmentNotification(task: Task): void {
    try {
      // Generate a unique ID for the notification
      const notificationId = `assign-${task.id}`;

      // Send the notification immediately
      PushNotification.localNotification({
        id: notificationId,
        channelId: 'new-assignments',
        title: 'New Task Assigned',
        message: `${this.partnerName} assigned you a new task: "${task.title}"`,
        userInfo: {
          taskId: task.id,
          type: 'new_assignment',
        },
      });

      console.log(`Sent new assignment notification for task ${task.id}`);
    } catch (error) {
      console.error('Error sending new assignment notification:', error);
    }
  }

  // Schedule notifications for all upcoming tasks
  async scheduleAllDueDateReminders(tasks: Task[]): Promise<void> {
    if (!this.userId) {
      console.error('User ID not set, cannot schedule reminders');
      return;
    }

    console.log(`Scheduling reminders for ${tasks.length} tasks`);

    // Filter tasks assigned to current user and with future due dates
    const relevantTasks = tasks.filter(task => 
      task.assignee_id === this.userId && 
      task.status !== 'completed'
    );

    console.log(`Found ${relevantTasks.length} relevant tasks for reminders`);

    // Schedule a reminder for each task
    for (const task of relevantTasks) {
      await this.scheduleDueDateReminder(task);
    }
  }

  // Cancel a notification for a specific task
  async cancelNotificationForTask(taskId: string, type: 'due_date' | 'new_assignment'): Promise<void> {
    try {
      // Get stored notification data
      const notificationData = await this.getNotificationData();
      
      // Find notifications for this task and type
      const matches = notificationData.filter(
        data => data.taskId === taskId && data.type === type
      );

      // Cancel each matching notification
      for (const match of matches) {
        PushNotification.cancelLocalNotification(match.notificationId);
        console.log(`Cancelled notification ${match.notificationId} for task ${taskId}`);
      }

      // Remove cancelled notifications from storage
      const updatedData = notificationData.filter(
        data => !(data.taskId === taskId && data.type === type)
      );
      await this.storeNotificationData(updatedData);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Cancel all notifications
  cancelAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
    AsyncStorage.removeItem('notificationData');
    console.log('Cancelled all notifications');
  }

  // Store notification data in AsyncStorage
  private async storeNotificationData(data: NotificationData | NotificationData[]): Promise<void> {
    try {
      // Get existing data
      const existingData = await this.getNotificationData();
      
      // Add new data (either single item or array)
      const updatedData = Array.isArray(data)
        ? [...data]
        : [...existingData.filter(item => item.taskId !== data.taskId || item.type !== data.type), data];
      
      // Store updated data
      await AsyncStorage.setItem('notificationData', JSON.stringify(updatedData));
    } catch (error) {
      console.error('Error storing notification data:', error);
    }
  }

  // Get stored notification data from AsyncStorage
  private async getNotificationData(): Promise<NotificationData[]> {
    try {
      const data = await AsyncStorage.getItem('notificationData');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting notification data:', error);
      return [];
    }
  }

  // Method to trigger a test notification immediately for debugging
  async triggerTestNotification(task: Task): Promise<void> {
    console.log(`🧪 TRIGGERING TEST NOTIFICATION for "${task.title}"`);
    
    // Schedule with test mode enabled (2 minutes in the future)
    await this.scheduleDueDateReminder(task, true);
  }
}

// Export a singleton instance
export default NotificationService.getInstance(); 