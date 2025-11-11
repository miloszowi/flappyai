export type NotificationType = 'success' | 'error' | 'info';

export class NotificationService {
    private static readonly CONTAINER_ID = 'notifications-container';
    private static readonly AUTO_DISMISS_TIME = 3000;

    static show(message: string, type: NotificationType = 'info', duration: number = this.AUTO_DISMISS_TIME): void {
        const container = document.getElementById(this.CONTAINER_ID);
        if (!container) {
            console.warn('Notifications container not found');
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cursor = 'pointer';

        container.appendChild(notification);

        notification.addEventListener('click', () => {
            this.dismiss(notification);
        });

        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(notification);
            }, duration);
        }
    }

    static success(message: string, duration?: number): void {
        this.show(message, 'success', duration);
    }

    static error(message: string, duration?: number): void {
        this.show(message, 'error', duration);
    }

    static info(message: string, duration?: number): void {
        this.show(message, 'info', duration);
    }

    private static dismiss(notification: HTMLElement): void {
        notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}
