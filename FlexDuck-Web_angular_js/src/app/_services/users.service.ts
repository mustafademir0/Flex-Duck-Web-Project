import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '@environments/environment';
import { User } from '@app/_models';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  // Cria o método para requisitar todos os users
  getAll(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users`).pipe(
      tap((users: User[]) => console.log('API Response:', users)),
      catchError((error) => {
        console.log('Error in API call:', error);
        return throwError('Houve um erro na chamada à API');
      })
    );
  }

  // Cria o método para adicionar um novo user
  addUser(newUser: User): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/users/add`, newUser);
  }

  // Cria o método para requisitar um user específico pelo ID
  getUserById(user_id: number): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/${user_id}`);
  }

  // Cria o método para deletar um user específico pelo ID
  deleteUserById(user_id: number): Observable<User> {
    return this.http.delete<User>(
      `${environment.apiUrl}/users/delete/${user_id}`
    );
  }

  // Cria o método para atualizar um user específico pelo ID
  updateUserById(user_id: number, updateClient: User): Observable<User> {
    return this.http.put<User>(
      `${environment.apiUrl}/users/update/${user_id}`,
      updateClient
    );
  }
}
