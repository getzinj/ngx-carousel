import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NgxCarouselComponent } from './ngx-carousel.component';

describe('NgxCarouselComponent', () => {
  let component: NgxCarouselComponent;
  let fixture: ComponentFixture<NgxCarouselComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxCarouselComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
    expect(component.ngOnInit).toBeTruthy();
  });
});
