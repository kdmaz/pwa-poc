import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConnectionStatusService {
  private isOnlineSubject = new BehaviorSubject(navigator.onLine);

  get isOnline$(): Observable<boolean> {
    return this.isOnlineSubject.asObservable();
  }

  constructor() {
    window.addEventListener('online', () => {
      this.isOnlineSubject.next(true);
    });

    window.addEventListener('offline', () => {
      this.isOnlineSubject.next(false);
    });
  }
}
