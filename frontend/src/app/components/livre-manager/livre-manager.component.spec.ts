import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LivreManagerComponent } from './livre-manager.component';

describe('LivreManagerComponent', () => {
  let component: LivreManagerComponent;
  let fixture: ComponentFixture<LivreManagerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LivreManagerComponent]
    });
    fixture = TestBed.createComponent(LivreManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
