import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { fromEvent, interval, Observable } from 'rxjs';
import {auditTime} from 'rxjs/operators';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'transcription-view';
  file:any;
  typeTiming = { selected: true};

  awsContent: {
    jobName: string,
    accountId: string,
    results: {
      transcripts: {transcript: string}[],
      items: {
        start_time: string,
        end_time: string,
        alternatives: {confidence: string, content: string}[],
        type: string
      }[]
    }
    status: string
  } | null = null;

  @ViewChild("content", {static: true}) divContent: any;
  @ViewChild("audio", {static: true}) audioPlayer: any;

  pagination: {
    total: number,
    perPage: number
    current: number,
    pages: {
      start_time: string,
      end_time: string,
      alternatives: {confidence: string, content: string}[],
      type: string
    }[][]
  } = {total: 0, pages: [], current: 0, perPage: 1000};
  subTime: any;
  isRunning = false;

  constructor() {

  }


  ngAfterViewInit() {
    const source = fromEvent(this.audioPlayer.nativeElement, 'timeupdate');
    const example = source.pipe(auditTime(5))
    const subscribe = example.subscribe(val => {
      if (this.audioPlayer && this.audioPlayer.nativeElement.duration) {
          this.setCurrentTime(this.audioPlayer.nativeElement.currentTime);
        }
    });

  }

  fileChanged($event: any) {
    this.file = $event.target.files[0];
  }

  importDocument() {
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      const result = fileReader.result;
      if (result)
        this.awsContent = JSON.parse(result.toString());
      this.loadContent();
    }
    fileReader.readAsText(this.file);
  }

  loadContent() {
    if (this.awsContent){
      if(this.typeTiming.selected) {
        const totalItems = this.awsContent.results.items.length;
        const perPage = this.pagination.perPage;
        this.pagination.total = Math.ceil(totalItems / perPage);
        this.pagination.current = 0;
        this.pagination.pages = [];
        for (let i = 0; i < totalItems; i++) {
          const iPage = Math.floor(i / perPage);
          if (!this.pagination.pages[iPage]) {
            this.pagination.pages[iPage] = [];
          }
          this.pagination.pages[iPage].push(this.awsContent.results.items[i]);
        }
        this.showCurrentPage();
      } else {
        this.divContent.nativeElement.innerHTML = this.awsContent.results.transcripts[0].transcript;
      }
    }
  }

  showCurrentPage() {
    this.divContent.nativeElement.innerHTML = "";
    const items = this.pagination.pages[this.pagination.current];
    items.forEach((item, i) => {
      const span = document.createElement('span');
      span.innerHTML = item.alternatives[0].content + " ";
      item.start_time ? span.setAttribute("start_time", item.start_time):null;
      item.end_time ? span.setAttribute("end_time", item.end_time):null;
      span.setAttribute("position", i.toString());
      span.className = "position-"+i;
      span.onclick = () => {
        this.audioPlayer.nativeElement.currentTime = item.start_time;
      }
      this.divContent.nativeElement.appendChild(span);
    })
  }

  audioChanged($event: any) {
    const urlObj = URL.createObjectURL( $event.target.files[0]);
    this.audioPlayer.nativeElement.src = urlObj;
  }

  setCurrentTime(currentTime: number) {
    if (this.awsContent && this.typeTiming.selected) {
      const currentActive = this.divContent.nativeElement.getElementsByClassName('active');
      if(currentActive.length) {
        while(currentActive.length > 0){
          currentActive[0].classList.remove('active');
        }
      }
      let i = 0;
      for(; i< this.pagination.pages.length; i++) {
        if (this.pagination.pages[i] && this.pagination.pages[i][0]) {
          const start = +this.pagination.pages[i][0].start_time;
          if (start > currentTime) {
            i--;
            break;
          }
        }
      }
      if (this.pagination.pages.length === i && i) {
        i--;
      }
      if (this.pagination.pages[i]) {
        let j=0;
        for (;j < this.pagination.pages[i].length; j++) {
          const start = +this.pagination.pages[i][j].start_time;
          if (start && start > currentTime) {
            j--;
            if(i != this.pagination.current) {
              this.pagination.current = i;
              this.showCurrentPage();
            }
            this.divContent.nativeElement.getElementsByClassName('position-'+j)[0].classList.add('active');
            break;
          }
        }
      }
    }
  }

  changePlayback($event: any) {
    this.audioPlayer.nativeElement.playbackRate  = +$event.target.value
  }

  itemsPerPageChanged($event: any) {
    this.pagination.perPage = +$event.target.value;
    if(this.typeTiming.selected)
      this.loadContent();

  }
}

