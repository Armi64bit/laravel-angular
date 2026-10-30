import { CommonModule } from '@angular/common';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthorBooksDialogComponent } from './components/author-books-dialog/author-books-dialog.component';
import { LivreManagerComponent } from './components/livre-manager/livre-manager.component';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';
import { LivreService } from './services/livre.service';

describe('AppComponent routing', () => {
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  beforeEach(waitForAsync(() => {
    const livreService = jasmine.createSpyObj<LivreService>('LivreService', [
      'getLivres',
      'addLivre',
      'updateLivre',
      'deleteLivre'
    ]);
    livreService.getLivres.and.returnValue(of({
      data: [],
      meta: {
        current_page: 1,
        from: null,
        last_page: 1,
        per_page: 5,
        to: null,
        total: 0,
        sort_by: null,
        sort_direction: 'desc' as const
      }
    }));

    TestBed.configureTestingModule({
      imports: [AppRoutingModule, CommonModule, ReactiveFormsModule],
      declarations: [AppComponent, AuthorBooksDialogComponent, LivreManagerComponent, NotificationToastComponent],
      providers: [{ provide: LivreService, useValue: livreService }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    router = TestBed.inject(Router);
  });

  it('redirects the root URL to the books page', async () => {
    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(router.url).toBe('/livres');
    expect(fixture.nativeElement.querySelector('app-livre-manager')).not.toBeNull();
  });

  it('redirects unknown URLs to the books page', async () => {
    await router.navigateByUrl('/unknown');
    fixture.detectChanges();

    expect(router.url).toBe('/livres');
    expect(fixture.nativeElement.querySelector('app-livre-manager')).not.toBeNull();
  });
});
