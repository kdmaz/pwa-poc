import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, EMPTY, forkJoin, Observable } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { Id } from './id.type';
import { PendingRequest } from './pending-request.interface';
import { User, UserDto } from './user.interface';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private base = 'http://localhost:3000/api/users';
  private USER_STORE = 'UserStore';
  private REQUEST_STORE = 'RequestStore';
  private TIMEOUT = 5000;

  private pendingRequests: PendingRequest[] = [];
  private pendingRequestsSubject = new BehaviorSubject<PendingRequest[]>([]);

  private userSubject = new BehaviorSubject<User[]>([]);
  private users: User[] = [];

  get users$(): Observable<User[]> {
    return this.userSubject.asObservable();
  }
  get hasPendingRequests$(): Observable<boolean> {
    return this.pendingRequests$.pipe(map((requests) => !!requests.length));
  }
  get pendingRequests$(): Observable<PendingRequest[]> {
    return this.pendingRequestsSubject.asObservable();
  }

  constructor(
    private http: HttpClient,
    private readonly ngxIndexedService: NgxIndexedDBService
  ) {
    this.ngxIndexedService
      .getAll<PendingRequest>(this.REQUEST_STORE)
      .subscribe((pendingRequests) => {
        this.pendingRequests = [...pendingRequests];
        this.pendingRequestsSubject.next(pendingRequests);

        if (!navigator.onLine) {
          this.fetchFromDb();
          return;
        }

        if (!this.pendingRequests.length) {
          this.fetchUsers();
          return;
        }

        const confirmSyncData = confirm('Do you want to sync your data?');
        if (confirmSyncData) {
          this.sync();
          this.fetchUsers();
        }

        this.fetchFromDb();
      });
  }

  fetchUsers(): void {
    this.http
      .get<User[]>(this.base)
      .pipe(
        timeout(this.TIMEOUT),
        catchError((error) => {
          if (error.status === 504) {
            this.getUsersInDbAndAddToUi();
          }
          return EMPTY;
        })
      )
      .subscribe(this.addAllUsersToDbAndUi.bind(this));
  }

  fetchFromDb(): void {
    this.getUsersInDbAndAddToUi();
  }

  addUser(userDto: UserDto): void {
    const url = this.base;
    const body = { ...userDto };
    const tempId = uuid();
    const newUser: User = { id: tempId, name: userDto.name };

    this.http
      .post<User>(url, body)
      .pipe(
        timeout(this.TIMEOUT),
        catchError((error) => {
          if (error.status === 504) {
            this.storeRequestInDbAndAddToUi('POST', url, tempId, body);
            this.addUserToDbAndUi(newUser);
          }
          return EMPTY;
        })
      )
      .subscribe(this.addUserToDbAndUi.bind(this));
  }

  updateUser(userDto: UserDto, id: Id): void {
    const url = `${this.base}/${id}`;
    const body = { ...userDto };
    const user: User = { id, name: userDto.name };

    this.http
      .put<User>(url, body)
      .pipe(
        timeout(this.TIMEOUT),
        catchError((error) => {
          if (error.status === 504) {
            this.storeRequestInDbAndAddToUi('PUT', url, id, body);
            this.updateUserToDbAndUi(user);
          }
          return EMPTY;
        })
      )
      .subscribe(this.updateUserToDbAndUi.bind(this));
  }

  deleteUser(id: Id): void {
    const url = `${this.base}/${id}`;

    if (typeof id === 'string') {
      this.deleteUserInDbAndUi(id);
      this.deleteRequestInDbAndUi(id);
      return;
    }

    this.http
      .delete<void>(url)
      .pipe(
        timeout(this.TIMEOUT),
        catchError((error) => {
          if (error.status === 504) {
            this.storeRequestInDbAndAddToUi('DELETE', url, id);
            this.deleteUserInDbAndUi(id);
          }
          return EMPTY;
        })
      )
      .subscribe(() => this.deleteUserInDbAndUi(id));
  }

  sync(): void {
    if (!navigator.onLine) {
      console.error('Not online! Cannot sync data!');
      return;
    }

    this.ngxIndexedService
      .getAll<PendingRequest>(this.REQUEST_STORE)
      .pipe(
        switchMap((requests) => {
          const r = requests.map(({ httpMethod, body, url, id }) => {
            return this.http.request<User>(httpMethod, url, { body }).pipe(
              map((user) => {
                return { isPost: httpMethod === 'POST', oldId: id, user };
              }),
              catchError((error) => {
                console.error('Get all users failed!', error);
                return EMPTY;
              })
            );
          });
          return forkJoin(r);
        })
      )
      .subscribe((requests) => {
        requests.map(({ isPost, oldId, user }) => {
          if (isPost) {
            this.addUserToDbAndUi(user);
            this.deleteUserInDbAndUi(oldId);
          }

          this.deleteRequestInDbAndUi(oldId);
        });
      });
  }

  private addAllUsersToDbAndUi(users: User[]): void {
    this.addAllUsersInDb(users);
    this.addAllUsersInUi(users);
  }

  private addUserToDbAndUi(user: User): void {
    this.addUserInDb(user);
    this.addUserInUi(user);
  }

  private updateUserToDbAndUi(user: User): void {
    this.updateUserInDb(user);
    this.updateUserInUi(user);
  }

  private deleteUserInDbAndUi(id: Id): void {
    this.deleteUserInDb(id);
    this.deleteUserInUi(id);
  }

  private deleteRequestInDbAndUi(id: Id): void {
    this.deleteRequestInDb(id);
    this.deleteRequestInUi(id);
  }

  // User Store DB
  private getUsersInDbAndAddToUi(): void {
    this.ngxIndexedService.getAll<User>(this.USER_STORE).subscribe((users) => {
      if (!users) {
        console.error('No users in db!');
        return;
      }
      this.addAllUsersInUi(users);
    });
  }

  private addAllUsersInDb(users: User[]): void {
    this.ngxIndexedService.clear(this.USER_STORE);
    this.ngxIndexedService.bulkAdd(this.USER_STORE, users);
  }

  private addUserInDb(user: User): void {
    this.ngxIndexedService.add(this.USER_STORE, user).subscribe();
  }

  private updateUserInDb(user: User): void {
    this.ngxIndexedService.update(this.USER_STORE, user).subscribe();
  }

  private deleteUserInDb(id: Id): void {
    this.ngxIndexedService.delete(this.USER_STORE, id).subscribe();
  }

  // Request Store DB
  private storeRequestInDbAndAddToUi(
    httpMethod: string,
    url: string,
    id: Id,
    body = {}
  ): void {
    const request: PendingRequest = {
      id,
      httpMethod,
      url,
      body,
      timestamp: Date.now(),
    };
    this.ngxIndexedService
      .add<PendingRequest>(this.REQUEST_STORE, request)
      .subscribe();
    this.addRequestInUi(request);
  }

  private deleteRequestInDb(id: Id): void {
    this.ngxIndexedService.delete(this.REQUEST_STORE, id).subscribe();
  }

  // User UI
  private addAllUsersInUi(users: User[]): void {
    this.users = [...users];
    this.userSubject.next(this.users);
  }

  private addUserInUi(user: User): void {
    this.users.push(user);
    this.userSubject.next(this.users);
  }

  private updateUserInUi(user: User, id?: Id): void {
    const index = this.findUserIndexById(id ?? user.id);
    this.users[index] = user;
    this.userSubject.next(this.users);
  }

  private deleteUserInUi(id: Id): void {
    this.users = this.users.filter((user) => user.id !== id);
    this.userSubject.next(this.users);
  }

  // Request UI
  private addRequestInUi(request: PendingRequest): void {
    this.pendingRequests.push(request);
    this.pendingRequestsSubject.next(this.pendingRequests);
  }

  private deleteRequestInUi(id: Id): void {
    this.pendingRequests = this.pendingRequests.filter(
      (request) => request.id !== id
    );
    this.pendingRequestsSubject.next(this.pendingRequests);
  }

  // Helpers
  private findUserIndexById(id: Id): number {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      throw new Error(`${id} not found in users UI list`);
    }
    return index;
  }
}
