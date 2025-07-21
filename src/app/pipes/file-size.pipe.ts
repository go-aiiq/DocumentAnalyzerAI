import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filesize',
  standalone: true
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number = 0): string {
    if (isNaN(parseFloat(String(bytes))) || !isFinite(bytes)) return '0 Bytes';
    
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    let unit = 0;
    
    while (bytes >= 1024 && unit < units.length - 1) {
      bytes /= 1024;
      unit++;
    }
    
    return `${bytes.toFixed(1)} ${units[unit]}`;
  }
}
