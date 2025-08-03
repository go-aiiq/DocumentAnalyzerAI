import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MatDialogModule, MatDialogContent } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';




@Component({
  selector: 'app-create-project-dialog',
  imports: [
    MatDialogModule,
    MatDialogContent,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  templateUrl: './create-project-dialog.component.html',
  styleUrl: './create-project-dialog.component.scss'
})
export class CreateProjectDialogComponent {
projectNamefg = new FormGroup({
      inputValue: new FormControl<string>('')
    });

    constructor(private dialogRef: MatDialogRef<CreateProjectDialogComponent>,private snackBar: MatSnackBar){
      
    }

    onCreateProject(){
    const projectName = this.projectNamefg.value.inputValue;
    console.log("Creating Project ",projectName);
    this.dialogRef.close(projectName);
    this.snackBar.open('Created Project', 'Close', { duration: 3000 });
  }
}
