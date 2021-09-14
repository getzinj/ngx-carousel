import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NgxItemComponent } from './ngx-item.component';

describe('NgxItemComponent', () => {
  let component: NgxItemComponent;
  let fixture: ComponentFixture<NgxItemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxItemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
