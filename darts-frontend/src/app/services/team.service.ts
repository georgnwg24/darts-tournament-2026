import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CreateTeamDto, Team, UpdateTeamDto } from '../models/team.model';
import { forkJoin, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private readonly teamsUrl = `/api/teams`;

  constructor(private readonly http: HttpClient) {}

  create(createTeamDto: CreateTeamDto): Observable<Team> {
    return this.http.post<Team>(this.teamsUrl, createTeamDto);
  }

  findAll(): Observable<Team[]> {
    return this.http.get<Team[]>(this.teamsUrl);
  }

  findById(id: string): Observable<Team> {
    const url = `${this.teamsUrl}/${id}`;
    return this.http.get<Team>(url);
  }

  findManyByIds(ids: string[]): Observable<Team[]> {
    return forkJoin(ids.map((id) => this.findById(id)));
  }

  update(id: string, updateTeamDto: UpdateTeamDto): Observable<Team> {
    const url = `${this.teamsUrl}/${id}`;
    return this.http.put<Team>(url, updateTeamDto);
  }

  delete(id: string): Observable<Team> {
    const url = `${this.teamsUrl}/${id}`;
    return this.http.delete<Team>(url);
  }
}
