import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';

export type NotificationToastVariant = 'success' | 'error' | 'info';

@Component({
  selector: 'app-notification-toast',
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationToastComponent implements OnChanges, OnDestroy {
  @Input() message = '';
  @Input() variant: NotificationToastVariant = 'success';
  @Output() dismissed = new EventEmitter<void>();

  isDismissing = false;
  private dismissTimeout: ReturnType<typeof setTimeout> | null = null;
  private exitTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private changeDetector: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message'] && this.message) {
      this.clearTimeouts();
      this.isDismissing = false;
      this.dismissTimeout = setTimeout(() => this.dismiss(), 3000);
    }
  }

  ngOnDestroy(): void {
    this.clearTimeouts();
  }

  get icon(): string {
    switch (this.variant) {
      case 'error':
        return '!';
      case 'info':
        return 'i';
      default:
        return '✓';
    }
  }

  dismiss(): void {
    if (this.isDismissing || !this.message) {
      return;
    }

    if (this.dismissTimeout !== null) {
      clearTimeout(this.dismissTimeout);
      this.dismissTimeout = null;
    }

    this.isDismissing = true;
    this.changeDetector.markForCheck();
    this.exitTimeout = setTimeout(() => {
      this.dismissed.emit();
      this.exitTimeout = null;
    }, 240);
  }

  private clearTimeouts(): void {
    if (this.dismissTimeout !== null) {
      clearTimeout(this.dismissTimeout);
      this.dismissTimeout = null;
    }
    if (this.exitTimeout !== null) {
      clearTimeout(this.exitTimeout);
      this.exitTimeout = null;
    }
  }
}
