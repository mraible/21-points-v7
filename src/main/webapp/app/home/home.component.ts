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
import { WeightService } from '../entities/weight/service/weight.service';
import { IWeight, IWeightByPeriod } from '../entities/weight/weight.model';

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
  weights!: IWeightByPeriod;
  weightOptions: any;
  weightData: any;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private accountService: AccountService,
    private router: Router,
    private pointsService: PointsService,
    private preferencesService: PreferencesService,
    private bloodPressureService: BloodPressureService,
    private weightService: WeightService
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
        // this.bpOptions = {... D3ChartService.getChartConfig() };
        if (bpReadings.readings.length) {
          // this.bpOptions.title.text = bpReadings.period;
          // this.bpOptions.chart.yAxis.axisLabel = 'Blood Pressure';
          const systolics: any = [];
          const diastolics: any = [];
          const upperValues: any = [];
          const lowerValues: any = [];
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
          this.bpOptions.chart.yDomain = [Math.min(...lowerValues) - 10, Math.max(...upperValues) + 10];
        } else {
          this.bpReadings.readings = [];
        }
      });

      this.weightService.last30Days().subscribe((weights: any) => {
        weights = weights.body;
        this.weights = weights;
        if (weights.weighIns.length) {
          // this.weightOptions = { ...D3ChartService.getChartConfig() };
          // this.weightOptions.title.text = this.weights.period;
          // this.weightOptions.chart.yAxis.axisLabel = 'Weight';
          const weightValues: any = [];
          const values: any = [];
          weights.weighIns.forEach((item: IWeight) => {
            weightValues.push({
              x: item.timestamp,
              y: item.weight,
            });
            values.push(item.weight);
          });
          this.weightData = [
            {
              values: weightValues,
              key: 'Weight',
              color: '#ffeb3b',
              area: true,
            },
          ];
          // set y scale to be 10 more than max and min
          this.weightOptions.chart.yDomain = [Math.min(...values) - 10, Math.max(...values) + 10];
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
