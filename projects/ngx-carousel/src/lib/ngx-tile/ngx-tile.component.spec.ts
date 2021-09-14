import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NgxTileComponent } from './ngx-tile.component';

describe('NgxTileComponent', () => {
  let component: NgxTileComponent;
  let fixture: ComponentFixture<NgxTileComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxTileComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxTileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
