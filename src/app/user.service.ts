import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, EMPTY, forkJoin, Observable } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { RequestEntity } from './request.interface';
import { User, UserDto } from './user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private base = 'http://localhost:3000/api/users';
  private userSubject = new BehaviorSubject<User[]>([]);
  private USER_STORE = 'UserStore';
  private TIMEOUT = 5000;

  private users: User[] = [];

  get users$(): Observable<User[]> {
    return this.userSubject.asObservable();
  }

  constructor(private http: HttpClient, private readonly ngxIndexedService: NgxIndexedDBService) {}

  fetchUsers(): void {
    this.http.get<User[]>(this.base).pipe(
      timeout(this.TIMEOUT),
      catchError((e) => {
        if (e.status === 504) {
          this.getUsersFromDb();
        }
        return EMPTY;
      }),
      switchMap((users) => {
        return this.ngxIndexedService.clear(this.USER_STORE).pipe(map(() => users));
      }),
      switchMap((users) => {
        return this.ngxIndexedService.bulkAdd('UserStore', users).pipe(map(() => users));
      })
    ).subscribe((users) => {
      this.users = [ ...users ];
      this.userSubject.next(this.users);
    });
  }

  addUser(userDto: UserDto): void {
    const url = this.base;
    const body = { ...userDto };
    const tempId = uuid();
    const newUser: User = { id: tempId, name: userDto.name };

    this.http.post<User>(url, body).pipe(
      timeout(this.TIMEOUT),
      catchError(() => {
        this.storeRequest('POST', url, tempId, body);
        this.addUserToDb(newUser);
        return EMPTY;
      })
    ).subscribe((user) => {
      this.addUserToDb(user);
    });
  }

  updateUser(userDto: UserDto, id: number): void {
    const url = `${this.base}/${id}`;
    const body = { ...userDto };
    const user: User = { id, name: userDto.name };

    this.http.put<User>(url, body).pipe(
      timeout(this.TIMEOUT),
      catchError(() => {
        this.storeRequest('PUT', url, id, body);
        return EMPTY;
      })
    ).subscribe({
      complete: () => {
        this.updateUserInDb(user);
      }
    });
  }

  deleteUser(id: number | string): void {
    const url = `${this.base}/${id}`;

    if (typeof id === 'string') {
      this.deleteUserInDb(id);
      return;
    }

    this.http.delete<void>(url).pipe(
      timeout(this.TIMEOUT),
      catchError(() => {
        this.storeRequest('DELETE', url, id);
        return EMPTY;
      })
    ).subscribe({
      complete: () => {
        this.deleteUserInDb(id);
      }
    });
  }

  sync(): void {
    if (!navigator.onLine) {
      console.error('not online! Cannot sync data');
      return;
    }

    this.ngxIndexedService.getAll<RequestEntity>('RequestStore').pipe(
      map((requests) => {
        return requests.map(({ httpMethod, body, url, id }) => {
          return this.http.request<User>(httpMethod, url, { body }).pipe(
            map((user) => {
              return { isPost: httpMethod === 'POST', oldId: id, user };
            }),
            catchError((error) => {
              console.error('request failed!', error);
              return EMPTY;
            }),
          );
        });
      }),
      switchMap((requests) => {
        return forkJoin(requests);
      }),
      map((uids) => {
        return uids.map(({ isPost, oldId, user }) => {
          if (isPost) {
            this.replaceNewUser(user, oldId);
          }

          return this.ngxIndexedService.delete<RequestEntity>('RequestStore', oldId);
        });
      }),
      switchMap((dbRequests) => {
        return forkJoin(dbRequests);
      })
    )
    .subscribe(() => {
      this.getUsersFromDb();
      console.log('offline data sync complete!');
    });
  }

  private replaceNewUser(newUser: User, oldId: string | number): void {
    this.ngxIndexedService.add('UserStore', newUser).subscribe();
    this.ngxIndexedService.delete('UserStore', oldId).subscribe();
  }

  private getUsersFromDb(): void {
    this.ngxIndexedService.getAll<User>('UserStore').subscribe((users) => {
      if (!users) {
        console.log('no users in db');
        return;
      }
      this.users = [ ...users ];
      this.userSubject.next(this.users);
    });
  }

  private storeRequest(httpMethod: string, url: string, id: number | string, body = {}): void {
    const request: RequestEntity = {
      id,
      httpMethod,
      url,
      body,
      timestamp: Date.now()
    };
    this.ngxIndexedService.add<RequestEntity>('RequestStore', request).subscribe(() => {
      console.log('Request stored!', request);

    });
  }

  private addUserToDb(user: User): void {
    this.ngxIndexedService.add('UserStore', user).subscribe();
    this.users.push(user);
    this.userSubject.next(this.users);
  }

  private updateUserInDb(user: User): void {
    this.ngxIndexedService.update('UserStore', user).subscribe();
    const index = this.users.findIndex(u => u.id === user.id);
    if (index === -1) {
      throw new Error(`${user.id} not found!`);
    }
    this.users[index] = user;
    this.userSubject.next(this.users);
  }

  private deleteUserInDb(id: number | string): void {
    this.ngxIndexedService.delete('UserStore', id).subscribe();

    if (typeof id === 'string') {
      this.ngxIndexedService.delete('RequestStore', id).subscribe();
    }

    this.users = this.users.filter((user) => user.id !== id);
    this.userSubject.next(this.users);
  }
}
