import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MatDialogContent } from '@angular/material/dialog';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';




@Component({
  selector: 'app-create-project-dialog',
  imports: [MatDialogContent, MatButtonModule,MatInputModule,MatFormField,ReactiveFormsModule],
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
