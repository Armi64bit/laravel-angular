import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthorBooksDialogComponent } from './components/author-books-dialog/author-books-dialog.component';
import { LivreManagerComponent } from './components/livre-manager/livre-manager.component';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';

@NgModule({
  declarations: [
    AppComponent,
    AuthorBooksDialogComponent,
    LivreManagerComponent,
    NotificationToastComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
