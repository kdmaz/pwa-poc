import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConnectionStatusService } from './connection-status.service';
import { UserService } from './user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private users$ = this.userService.users$;
  private isOnline$ = this.connectionStatusService.isOnline$;
  private hasPendingRequests$ = this.userService.hasPendingRequests$;
  private pendingRequests$ = this.userService.pendingRequests$;

  vm$ = combineLatest([
    this.users$,
    this.isOnline$,
    this.hasPendingRequests$,
    this.pendingRequests$,
  ]).pipe(
    map(([users, isOnline, hasPendingRequests, pendingRequests]) => ({
      users,
      isOnline,
      hasPendingRequests,
      pendingRequests,
    }))
  );

  @ViewChild('name') newName?: ElementRef;

  constructor(
    private readonly userService: UserService,
    private readonly connectionStatusService: ConnectionStatusService
  ) {}

  ngOnInit(): void {}

  fetchUsers(): void {
    this.userService.fetchUsers();
  }

  fetchFromDb(): void {
    this.userService.fetchFromDb();
  }

  addUser(): void {
    if (!this.newName) {
      return;
    }

    const name = this.newName.nativeElement.value;
    this.newName.nativeElement.value = '';

    this.userService.addUser({
      name,
    });
    this.newName.nativeElement.value = '';
  }

  deleteUser(id: number | string): void {
    this.userService.deleteUser(id);
  }

  sync(): void {
    this.userService.sync();
  }
}
