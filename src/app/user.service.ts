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
    const newUser: User = { id: uuid(), name: userDto.name };

    this.http.post<User>(url, body).pipe(
      timeout(this.TIMEOUT),
      catchError(() => {
        this.storeRequest('POST', url, body);
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
        this.storeRequest('PUT', url, body, id);
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
    if(!navigator.onLine) {
      console.error('not online! Cannot sync data')
      return;
    }

    this.ngxIndexedService.getAll<RequestEntity>('RequestStore').pipe(
      map((requests) => {
        return requests.map(({ httpMethod, body, url, id }) => {
          return this.http.request<User>(httpMethod, url, { body }).pipe(
            map((user) => {
              return user.id;
            }),
            catchError((error) => {
              console.error('request failed!', error);
              return EMPTY;
            }),
          )
        })
      }),
      switchMap((requests) => {
        return forkJoin(requests);
      }),
      map((uids) => {
        return uids.map(uid => this.ngxIndexedService.delete<RequestEntity>('RequestStore', uid))
      }),
      switchMap((dbRequests) => {
        return forkJoin(dbRequests);
      })
    )
    .subscribe(() => {
      console.log('offline data sync complete!');
    });
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

  private storeRequest(httpMethod: string, url: string, body = {}, id?: number | string): void {
    const request: RequestEntity = {
      id: id ?? uuid(),
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
    this.ngxIndexedService.add('UserStore', user).subscribe(() => {
      console.log('add success!');
    });
    this.users.push(user);
    this.userSubject.next(this.users);
  }

  private updateUserInDb(user: User): void {
    this.ngxIndexedService.update('UserStore', user).subscribe(() => {
      console.log('update success!');
    });
    const index = this.users.findIndex(u => u.id === user.id);
    if (index === -1) {
      throw new Error(`${user.id} not found!`);
    }
    this.users[index] = user;
    this.userSubject.next(this.users);
  }

  private deleteUserInDb(id: number | string): void {
    this.ngxIndexedService.delete('UserStore', id).subscribe(() => {
      console.log('delete success!');
    });
    this.users = this.users.filter((user) => user.id !== id);
    this.userSubject.next(this.users);
  }
}
