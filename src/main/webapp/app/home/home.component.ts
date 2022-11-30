import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountService } from 'app/core/auth/account.service';
import { Account } from 'app/core/auth/account.model';
import { PointsService } from '../entities/points/service/points.service';
import { IPointsPerWeek } from '../entities/points/points.model';
import { PreferencesService } from '../entities/preferences/service/preferences.service';
import { IPreferences } from '../entities/preferences/preferences.model';
import { BloodPressureService } from '../entities/blood-pressure/service/blood-pressure.service';
import { IBloodPressure, IBloodPressureByPeriod } from '../entities/blood-pressure/blood-pressure.model';

@Component({
  selector: 'jhi-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  account: Account | null = null;
  pointsThisWeek: IPointsPerWeek = { points: 0 };
  pointsPercentage?: number;
  preferences!: IPreferences;
  bpReadings!: IBloodPressureByPeriod;
  bpOptions: any;
  bpData: any;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private accountService: AccountService,
    private router: Router,
    private pointsService: PointsService,
    private preferencesService: PreferencesService,
    private bloodPressureService: BloodPressureService
  ) {}

  ngOnInit(): void {
    this.accountService
      .getAuthenticationState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(account => {
        this.account = account;
        this.getUserData();
      });
  }

  getUserData(): void {
    // Get preferences
    this.preferencesService.user().subscribe((preferences: any) => {
      this.preferences = preferences.body;

      // Get points for the current week
      this.pointsService.thisWeek().subscribe(response => {
        if (response.body) {
          this.pointsThisWeek = response.body;
          this.pointsPercentage = (this.pointsThisWeek.points / 21) * 100;

          // calculate success, warning, or danger
          if (this.pointsThisWeek.points >= preferences.weeklyGoal) {
            this.pointsThisWeek.progress = 'success';
          } else if (this.pointsThisWeek.points < 10) {
            this.pointsThisWeek.progress = 'danger';
          } else if (this.pointsThisWeek.points > 10 && this.pointsThisWeek.points < preferences.weeklyGoal) {
            this.pointsThisWeek.progress = 'warning';
          }
        }
      });
      // Get blood pressure readings for the last 30 days
      this.bloodPressureService.last30Days().subscribe((bpReadings: any) => {
        bpReadings = bpReadings.body;
        this.bpReadings = bpReadings;
        //this.bpOptions = {... D3ChartService.getChartConfig() };
        if (bpReadings.readings.length) {
          //this.bpOptions.title.text = bpReadings.period;
          //this.bpOptions.chart.yAxis.axisLabel = 'Blood Pressure';
          let systolics: any = [];
          let diastolics: any = [];
          let upperValues: any = [];
          let lowerValues: any = [];
          bpReadings.readings.forEach((item: IBloodPressure) => {
            systolics.push({
              x: item.timestamp,
              y: item.systolic,
            });
            diastolics.push({
              x: item.timestamp,
              y: item.diastolic,
            });
            upperValues.push(item.systolic);
            lowerValues.push(item.diastolic);
          });
          this.bpData = [
            {
              values: systolics,
              key: 'Systolic',
              color: '#673ab7',
            },
            {
              values: diastolics,
              key: 'Diastolic',
              color: '#03a9f4',
            },
          ];
          // set y scale to be 10 more than max and min
          this.bpOptions.chart.yDomain = [Math.min.apply(Math, lowerValues) - 10, Math.max.apply(Math, upperValues) + 10];
        } else {
          this.bpReadings.readings = [];
        }
      });
    });
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
