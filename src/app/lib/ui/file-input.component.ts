/**************************************
 * form <input type="file"> component
 * <ap-file-input>
 **************************************/

import {
  Component,
  Input,
  Output,
  ChangeDetectorRef,
  EventEmitter
} from '@angular/core';

@Component({
  selector: 'ap-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.css']
})
export class FileInputComponent {
  @Input() disabled = false;
  @Input() multiple = false;
  @Input() maxfilesize = null; //** 1MB default
  @Input() accept = ''; // ** html input attribute value
  @Input() astext = false; // ** return text instead of base64
  @Input() preview = false;
  @Input() icon = false;
  @Input() label = 'Upload File'; // ** button text
  @Output() chosen: EventEmitter<any> = new EventEmitter();
  @Output() invalid: EventEmitter<any> = new EventEmitter();
  @Output() cleared: EventEmitter<any> = new EventEmitter();

  public avatar = null;

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  //** detect file change event handler **
  fileChange(input) {
    //** read all file in file list array **
    this.readFiles(input.files);
  }

  dragOver(e) {
    e.preventDefault();
  }

  drop(ev) {
    ev.preventDefault();
    if (ev.dataTransfer.files) {
      if (ev.dataTransfer.files.length > 0) {
        this.readFiles(ev.dataTransfer.files);
      }
    }
  }

  clear() {
    this.avatar = null;
    this.cleared.emit();
  }

  //** process file list array **
  readFiles(files, index = 0) {
    const reader = new FileReader();
    const errmsg = { type: '', value: '', message: '' };

    //** If there is a file **
    if (index in files) {
      // ** Check file size **
      if (this.maxfilesize && files[index].size > this.maxfilesize) {
        errmsg.type = 'SIZE';
        errmsg.value = files[index].size;
        errmsg.message = `File size exceeds the accepted maximum size of ${this.maxfilesize}`;
        this.invalid.emit(errmsg); //** fire invalid size event
        return;
      }
      // ** Check file type **
      if (this.accept.indexOf('/*') != -1) {
        // ** if <filetype>/* used in accept attribute
        const ftype = files[index].type.substring(
          0,
          files[index].type.indexOf('/')
        );
        if (this.accept.indexOf(ftype) < 0) {
          errmsg.type = 'TYPE';
          errmsg.value = files[index].type;
          errmsg.message = `File type does not match the accepted type (${this.accept}) specified.`;
          this.invalid.emit(errmsg); //** fire invalid type event
          return;
        }
      }

      // Start reading this file
      this.readFile(files[index], reader, (result) => {
        // ** callback function **
        if (index == 0 && this.preview) {
          this.avatar = result;
        }
        this.chosen.emit({ name: files[index].name, data: result }); //** fire chosen event

        this.readFiles(files, index + 1);
        // ****** resize image? **
        /*
                // Create an img element and add the image file data to it
                let img = document.createElement("img");
                img.src = result;
            
                // Send this img to the resize function (and wait for callback)
                this.resize(img, 42, 42, (resized_jpeg, before, after)=> {   
                    // ** callback function **

                    // Add the resized jpeg img source to a list for preview
                    // This is also the file you want to upload. (either as a
                    // base64 string or img.src = resized_jpeg if you prefer a file). 
                    this.file_srcs.push(resized_jpeg);
            
                    // Read the next file;
                    this.readFiles(files, index+1);
                });
                */
      });
    } else {
      // When all files are done This forces a change detection
      this.changeDetectorRef.detectChanges();
    }
  }

  // ** read file contents **
  readFile(file, reader, callback) {
    reader.onload = () => {
      callback(reader.result);
    };

    if (file.type.indexOf('text') != -1 || this.astext) {
      reader.readAsText(file);
    } else {
      // read as base64
      reader.readAsDataURL(file);
    }
  }

  // ** resize image file **
  resize(img, MAX_WIDTH: number, MAX_HEIGHT: number, callback) {
    // This will wait until the img is loaded before calling this function
    return (img.onload = () => {
      // Get the images current width and height
      let width = img.width;
      let height = img.height;

      // Set the WxH to fit the Max values (but maintain proportions)
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      // create a canvas object
      const canvas = document.createElement('canvas');

      // Set the canvas to the new calculated dimensions
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0, width, height);

      // Get this encoded as a jpeg
      // IMPORTANT: 'jpeg' NOT 'jpg'
      const dataUrl = canvas.toDataURL('image/jpeg');

      // callback with the results
      callback(dataUrl, img.src.length, dataUrl.length);
    });
  }
}
