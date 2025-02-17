import { NgxCarouselItemDirective, NgxCarouselNextDirective, NgxCarouselPrevDirective } from './ngx-carousel.directive';
import {
  Component,
  ElementRef,
  Renderer2,
  Input,
  Output,
  OnInit,
  OnDestroy,
  AfterViewInit,
  HostListener,
  EventEmitter,
  ContentChildren,
  QueryList,
  ViewChild,
  AfterContentInit,
  ViewChildren,
  ContentChild,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { NgxCarouselStore, NgxCarousel } from './ngx-carousel.interface';
import { Subscription } from 'rxjs';
import * as Hammer from 'hammerjs';

@Component({
  selector: 'ngx-carousel',
  templateUrl: './ngx-carousel.component.html',
  styleUrls: [ './ngx-carousel-new.component.scss' ]
})
export class NgxCarouselComponent
  implements OnInit, AfterContentInit, AfterViewInit, OnDestroy, OnChanges {
  itemsSubscribe: Subscription | undefined;
  carouselCssNode: HTMLStyleElement = undefined as any;
  pointIndex: number | undefined;
  pointers: number | undefined;

  // tslint:disable-next-line:no-input-rename
  @Input('inputs') userData: NgxCarousel = undefined as any;
  @Input('moveToSlide') moveToSlide: number | undefined;

  @Output('carouselLoad') carouselLoad: EventEmitter<number> = new EventEmitter<number>();
  @Output('onMove') onMove: EventEmitter<NgxCarouselStore> = new EventEmitter<NgxCarouselStore>();
  @Output('afterCarouselViewed') afterCarouselViewed: EventEmitter<NgxCarouselStore> = new EventEmitter<NgxCarouselStore>();

  @ContentChildren(NgxCarouselItemDirective)
  private items: QueryList<NgxCarouselItemDirective> | undefined;

  @ViewChildren('pointInner', { read: ElementRef })
  private points: QueryList<ElementRef> | undefined;

  @ContentChild(NgxCarouselNextDirective, { read: ElementRef })
  private next: ElementRef | undefined;

  @ContentChild(NgxCarouselPrevDirective, { read: ElementRef })
  private prev: ElementRef | undefined;

  @ViewChild('main', { read: ElementRef })
  private carousel1: ElementRef | undefined;

  @ViewChild('points', { read: ElementRef })
  private pointMain: ElementRef | undefined;

  private forTouch: HTMLElement | undefined;

  private leftBtn: HTMLButtonElement | undefined;
  private rightBtn: HTMLButtonElement | undefined;
  private evtValue: number | undefined;
  private pauseCarousel: boolean = false;
  private pauseInterval: number = undefined as any;

  private carousel: HTMLDivElement = undefined as any;
  private carouselMain: HTMLDivElement = undefined as any;
  private carouselInner: HTMLDivElement = undefined as any;
  private carouselItems: HTMLCollectionOf<Element> = undefined as any;

  private onResize: number = undefined as any;
  private onScrolling: number = undefined as any;
  private carouselInt: number = undefined as any;

  public pointNumbers: number[] = [];
  public data: NgxCarouselStore = {
    type: 'fixed',
    classText: '',
    deviceType: 'lg',
    items: 0,
    load: 0,
    deviceWidth: 0,
    carouselWidth: 0,
    itemWidth: 0,
    visibleItems: { start: 0, end: 0 },
    slideItems: 0,
    itemWidthPer: 0,
    itemLength: 0,
    currentSlide: 0,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    speed: 400,
    transform: { xs: 0, sm: 0, md: 0, lg: 0, all: 0 },
    loop: false,
    dexVal: 0,
    touchTransform: 0,
    touch: { active: false, swipe: '', velocity: 0 },
    isEnd: false,
    isFirst: true,
    isLast: false
  };


  constructor(private el: ElementRef<HTMLDivElement>, private renderer: Renderer2) { }


  public ngOnInit(): void {
    this.carousel = this.el.nativeElement;
  }


  public ngAfterContentInit(): void {
    this.carouselMain = this.el.nativeElement.getElementsByClassName('ngxcarousel')[0] as HTMLDivElement;
    this.carouselInner = this.carouselMain.getElementsByClassName('ngxcarousel-items')[0] as HTMLDivElement;
    this.forTouch = this.carouselInner;
    this.carouselItems = this.carouselInner?.getElementsByClassName('item');

    this.data.type = this.userData?.grid?.all !== 0 ? 'fixed' : 'responsive';
    this.data.loop = this.userData?.loop || false;
    this.data.easing = this.userData?.easing || 'cubic-bezier(0, 0, 0.2, 1)';
    this.data.touch.active = this.userData?.touch || false;

    this.carouselSize();

    this.rightBtn = this.next?.nativeElement;
    this.leftBtn = this.prev?.nativeElement;

    this.renderer.listen(this.leftBtn, 'click', (): void =>
      this.carouselScrollOne(0)
    );
    this.renderer.listen(this.rightBtn, 'click', (): void =>
      this.carouselScrollOne(1)
    );

    this.carouselCssNode = this.createStyleNode();

    this.storeCarouselData();
    this.carouselInterval();
    this.onWindowScrolling();
    this.buttonControl();
    this.touch();
    this.carouselPoint();

    this.itemsSubscribe = this.items?.changes?.subscribe((val): void => {
      this.data.isLast = false;
      this.carouselPoint();
      this.buttonControl();
    });
    if (this.moveToSlide) {
      this.moveTo(this.moveToSlide);
    }
  }


  public ngAfterViewInit(): void {
    if (this.userData?.point?.pointStyles) {
      const datas: string = this.userData.point.pointStyles.replace(
        /.ngxcarouselPoint/g,
        `.${this.data.classText} .ngxcarouselPoint`
      );

      const pointNode: HTMLStyleElement =  this.createStyleNode(datas);
    } else if (this.userData?.point && this.userData?.point?.visible) {
      this.renderer.addClass(
        this.pointMain?.nativeElement,
        'ngxcarouselPointDefault'
      );
    }
    this.afterCarouselViewed.emit(this.data);
  }


  public ngOnDestroy(): void {
    clearInterval(this.carouselInt);
    this.itemsSubscribe?.unsubscribe();
  }


  @HostListener('window:resize', ['$event'])
  public onResizing(event: UIEvent): void {
    clearTimeout(this.onResize);
    this.onResize = setTimeout((): void => {
      if (this.data.deviceWidth !== (event?.target as Window)?.outerWidth) {
        this.storeCarouselData();
      }
    }, 500);
  }


  public ngOnChanges(changes: SimpleChanges): void {
    if (this.moveToSlide != null && this.moveToSlide > -1) {
      this.moveTo(changes.moveToSlide.currentValue);
    }
  }


  /* store data based on width of the screen for the carousel */
  private storeCarouselData(): void {
    this.data.deviceWidth = window.innerWidth;
    this.data.carouselWidth = this.carouselMain.offsetWidth;

    if (this.data.type === 'responsive') {
      this.data.deviceType =
        this.data.deviceWidth >= 1200
          ? 'lg'
          : this.data.deviceWidth >= 992
            ? 'md'
            : this.data.deviceWidth >= 768 ? 'sm' : 'xs';

      if (this.data.deviceWidth >= 1200) {
        this.data.items = this.userData?.grid?.lg ?? 1;
      } else {
        if (this.data.deviceWidth >= 992) {
          this.data.items = this.userData?.grid?.md;
        } else {
          if (this.data.deviceWidth >= 768) {
            this.data.items = this.userData?.grid?.sm;
          } else {
            this.data.items = this.userData?.grid?.xs ?? 1;
          }
        }
      }
      this.data.itemWidth = this.data.carouselWidth / this.data.items;
    } else {
      this.data.items = Math.trunc(
        this.data.carouselWidth / this.userData.grid.all
      );
      this.data.itemWidth = this.userData.grid.all;
      this.data.deviceType = 'all';
    }

    this.data.slideItems = !!this.userData.slide && (this.userData.slide < this.data.items)
      ? this.userData.slide
      : this.data.items;
    this.data.load =
      !!this.userData.load && (this.userData.load >= this.data.slideItems)
        ? this.userData.load
        : this.data.slideItems;
    this.data.speed =
      this.userData?.speed != null  && this.userData?.speed > -1
        ? this.userData?.speed
        : 400;
  }


  /* Get Touch input */
  private touch(): void {
    if (this.data.touch.active) {
      const hammertime: HammerManager = new Hammer(this.forTouch as HTMLElement);
      hammertime.get('pan').set({ direction: Hammer.DIRECTION_HORIZONTAL });

      hammertime.on('panstart', (ev: HammerInput): void => {
        this.data.carouselWidth = this.carouselInner.offsetWidth;
        this.data.touchTransform = this.data.transform[this.data.deviceType];

        this.data.dexVal = 0;
        this.setStyle(this.carouselInner, 'transition', '');
      });
      hammertime.on('panleft', (ev: HammerInput): void => {
        this.touchHandling('panleft', ev);
      });
      hammertime.on('panright', (ev: HammerInput): void => {
        this.touchHandling('panright', ev);
      });
      hammertime.on('panend', (ev: HammerInput): void => {
        // this.setStyle(this.carouselInner, 'transform', '');
        if (this.data.shouldSlide) {
          this.data.touch.velocity = ev.velocity;
          this.data.touch.swipe === 'panright'
            ? this.carouselScrollOne(0)
            : this.carouselScrollOne(1);
        } else {
          this.data.dexVal = 0;
          this.data.touchTransform = this.data.transform[this.data.deviceType];
          this.setStyle(this.carouselInner, 'transition', 'transform 324ms cubic-bezier(0, 0, 0.2, 1)');
          const tran: number = this.data.touchTransform * -1;
          this.setStyle(this.carouselInner, 'transform', 'translate3d(' + tran + '%, 0px, 0px)');
        }
      });
      hammertime.on("hammer.input", (ev: HammerInput): void => {
        // allow nested touch events to no propagate, this may have other side affects but works for now.
        // TODO: It is probably better to check the source element of the event and only apply the handle to the correct carousel
        ev.srcEvent.stopPropagation()
     });
    }
  }


  /* handle touch input */
  private touchHandling(e: string, ev: HammerInput): void {

    // vertical touch events seem to cause to panstart event with an odd delta
    // and a center of {x:0,y:0} so this will ignore them
    if (ev.center.x === 0) { return }

    const deltaX: number = Math.abs(ev.deltaX);
    let valt: number = deltaX - this.data.dexVal;
    valt =
      this.data.type === 'responsive'
        ? Math.abs(deltaX - this.data.dexVal) / this.data.carouselWidth * 100
        : valt;
    this.data.dexVal = deltaX;
    this.data.touch.swipe = e;
    this.data.touchTransform =
      e === 'panleft'
        ? valt + this.data.touchTransform
        : this.data.touchTransform - valt;

    this.data.shouldSlide = (deltaX > this.data.carouselWidth * 0.1);

    if (this.data.touchTransform > 0) {
      this.setStyle(
        this.carouselInner,
        'transform',
        this.data.type === 'responsive'
          ? `translate3d(-${ this.data.touchTransform }%, 0px, 0px)`
          : `translate3d(-${ this.data.touchTransform }px, 0px, 0px)`
      );
    } else {
      this.data.touchTransform = 0;
    }
  }


  /* this used to disable the scroll when it is not on the display */
  private onWindowScrolling(): void {
    const top: number = this.carousel?.offsetTop ?? 0;
    const scrollY: number = window.scrollY;
    const heightt: number = window.innerHeight;
    const carouselHeight: number = this.carousel?.offsetHeight ?? 0;

    if (
      top <= scrollY + heightt - carouselHeight / 4 &&
      top + carouselHeight / 2 >= scrollY
    ) {
      this.carouselIntervalEvent(0);
    } else {
      this.carouselIntervalEvent(1);
    }
  }

  /* Init carousel point */
  private carouselPoint(): void {
    if (this.data.slideItems === 0) {
      setTimeout((): void => {
        this.carouselPoint();
      }, 10);
    } else if (this.userData?.point?.visible) {
      const e: number = (this.items?.length ?? 0) - (this.data.items - this.data.slideItems);
      this.pointIndex = Math.ceil(e / this.data.slideItems);
      const n: number[] = [];
      for (let r: number = 0; r < this.pointIndex; r++) {
        n.push(r);
      }
      this.pointNumbers = n;
      setTimeout((): void => {
        this.carouselPointActiver()
      });
    }
  }


  /* change the active point in carousel */
  private carouselPointActiver(): void {
    this.pointers = Math.ceil(this.data.currentSlide / this.data.slideItems);
  }


  /* this function is used to scroll the carousel when point is clicked */
  public moveTo(index: number): void {
    if ((this.pointers !== index) && (index < (this.pointIndex ?? 0))) {
      let slideremains: number = 0;
      const btns: number = this.data.currentSlide < index ? 1 : 0;

      if (index === 0) {
        this.makeIsFirstAndIsLast(1, 0);
        slideremains = index * this.data.slideItems;
      } else if (index === this.pointIndex ?? 0 - 1) {
        this.makeIsFirstAndIsLast(0, 1);
        slideremains = (this.items ?? [ ]).length - this.data.items;
      } else {
        this.makeIsFirstAndIsLast(0, 0);
        slideremains = index * this.data.slideItems;
      }
      this.carouselScrollTwo(btns, slideremains, this.data.speed);
    }
  }

  /* set the style of the carousel based the inputs data */
  private carouselSize(): void {
    this.data.classText = this.generateID();
    const styleId: string = '.' + this.data.classText + ' > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items >';

    if (this.userData?.custom === 'banner') {
      this.renderer.addClass(this.carousel, 'banner');
    }

    let dism: string = '';
    if (this.userData?.animation === 'lazy') {
      dism += `${ styleId } .item {transition: transform .6s ease;}`;
    }

    let itemStyle: string = '';
    if (this.data.type === 'responsive') {
      const itemWidth_xs: string =
        this.userData.type === 'mobile'
          ? `${ styleId } .item {width: ${ 95 / this.userData.grid.xs }%}`
          : `${ styleId } .item {width: ${ 100 / this.userData.grid.xs }%}`;

      const itemWidth_sm: string =
        styleId + ' .item {width: ' + 100 / this.userData.grid.sm + '%}';
      const itemWidth_md: string =
        styleId + ' .item {width: ' + 100 / this.userData.grid.md + '%}';
      const itemWidth_lg: string =
        styleId + ' .item {width: ' + 100 / this.userData.grid.lg + '%}';

      itemStyle = `@media (max-width:767px){${ itemWidth_xs }}
                   @media (min-width:768px){${ itemWidth_sm }}
                   @media (min-width:992px){${ itemWidth_md }}
                   @media (min-width:1200px){${ itemWidth_lg }}`;
    } else {
      itemStyle = `${ styleId } .item {width: ${ this.userData.grid.all }px}`;
    }

    this.renderer.addClass(this.carousel, this.data.classText);

    this.createStyleNode(`${dism} ${itemStyle}`);
  }


  private createStyleNode(styleText: string = ''): HTMLStyleElement {
    const styleChild: HTMLStyleElement = document.createElement('style');
    styleChild.innerHTML = styleText;

    this.carousel?.appendChild(styleChild);

    return styleChild;
  }


  /* logic to scroll the carousel step 1 */
  private carouselScrollOne(Btn: number): void {
    let itemSpeed: number = this.data.speed;
    let translateXval;
    let currentSlide: number = 0;
    const touchMove: number = Math.ceil(this.data.dexVal / this.data.itemWidth);
    this.setStyle(this.carouselInner, 'transform', '');

    if (this.pointIndex === 1) {
      return;
    } else if (
      Btn === 0 &&
      ((!this.data.loop && !this.data.isFirst) || this.data.loop)
    ) {
      const slide: number = this.data.slideItems * (this.pointIndex ?? 0);

      const currentSlideD: number = this.data.currentSlide - this.data.slideItems;
      const MoveSlide: number = currentSlideD + this.data.slideItems;
      this.makeIsFirstAndIsLast(0, 1);
      if (this.data.currentSlide === 0) {
        currentSlide = (this.items ?? [ ]).length - this.data.items;
        itemSpeed = 400;
        this.makeIsFirstAndIsLast(0, 1);
      } else if (this.data.slideItems >= MoveSlide) {
        currentSlide = translateXval = 0;
        this.makeIsFirstAndIsLast(1, 0);
      } else {
        this.makeIsFirstAndIsLast(0, 0);
        if (touchMove > this.data.slideItems) {
          currentSlide = this.data.currentSlide - touchMove;
          itemSpeed = 200;
        } else {
          currentSlide = this.data.currentSlide - this.data.slideItems;
        }
      }
      this.carouselScrollTwo(Btn, currentSlide, itemSpeed);
    } else if (Btn === 1 && ((!this.data.loop && !this.data.isLast) || this.data.loop)) {
      if (
          (this.items ?? [ ]).length <=
          this.data.currentSlide + this.data.items + this.data.slideItems &&
        !this.data.isLast
      ) {
        currentSlide = (this.items ?? [ ]).length - this.data.items;
        this.makeIsFirstAndIsLast(0, 1);
      } else if (this.data.isLast) {
        currentSlide = translateXval = 0;
        itemSpeed = 400;
        this.makeIsFirstAndIsLast(1, 0);
      } else {
        this.makeIsFirstAndIsLast(0, 0);
        if (touchMove > this.data.slideItems) {
          currentSlide =
            this.data.currentSlide +
            this.data.slideItems +
            (touchMove - this.data.slideItems);
          itemSpeed = 200;
        } else {
          currentSlide = this.data.currentSlide + this.data.slideItems;
        }
      }
      this.carouselScrollTwo(Btn, currentSlide, itemSpeed);
    }
  }


  /* logic to scroll the carousel step 2 */
  private carouselScrollTwo(
    Btn: number,
    currentSlide: number,
    itemSpeed: number
  ): void {
    this.data.visibleItems.start = currentSlide;
    this.data.visibleItems.end = currentSlide + this.data.items - 1;
    if (this.userData?.animation) {
      this.carouselAnimator(
        Btn,
        currentSlide + 1,
        currentSlide + this.data.items,
        itemSpeed,
        Math.abs(this.data.currentSlide - currentSlide)
      );
    }
    if (this.data.dexVal !== 0) {
      const val: number = Math.abs(this.data.touch.velocity);
      let somt: number = Math.floor(
        this.data.dexVal /
          val /
          this.data.dexVal *
          (this.data.deviceWidth - this.data.dexVal)
      );
      somt = somt > itemSpeed ? itemSpeed : somt;
      itemSpeed = somt < 200 ? 200 : somt;
      this.data.dexVal = 0;
    }
    this.setStyle(
      this.carouselInner,
      'transition',
      `transform ${itemSpeed}ms ${this.data.easing}`
    );
    this.data.itemLength = (this.items ?? [ ]).length;
    this.setTheTransformStyleToScrollTheCarousel(currentSlide);
    this.data.currentSlide = currentSlide;
    this.onMove.emit(this.data);
    this.carouselPointActiver();
    this.triggerCarouselToLoadItems();
    this.buttonControl();
  }


  private makeIsFirstAndIsLast(first: number, last: number): void {
    this.data.isFirst = !!first;
    this.data.isLast = !!last;
  }


  private setTheTransformStyleToScrollTheCarousel(slide: number): void {
    if (this.data.type === 'responsive') {
      this.setResponsiveTransforms(slide);
      this.carouselCssNode.innerHTML = this.getResponsiveSlideCSS();
    } else {
      this.setNonResponsiveTransforms(slide);
      this.carouselCssNode.innerHTML = this.getNonResponsiveSlideCSS();
    }
  }


  private getNonResponsiveSlideCSS(): `.${string} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${number}px, 0, 0);` {
    return `.${this.data
      .classText} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${this.data
      .transform.all}px, 0, 0);`;
  }


  private getResponsiveSlideCSS(): `@media (max-width: 767px) {
              .${string} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${number}%, 0, 0); } }
            @media (min-width: 768px) {
              .${string} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${number}%, 0, 0); } }
            @media (min-width: 992px) {
              .${string} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${number}%, 0, 0); } }
            @media (min-width: 1200px) {
              .${string} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${number}%, 0, 0); } }` {
    return `@media (max-width: 767px) {
              .${this.data
      .classText} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${this
      .data.transform.xs}%, 0, 0); } }
            @media (min-width: 768px) {
              .${this.data
      .classText} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${this
      .data.transform.sm}%, 0, 0); } }
            @media (min-width: 992px) {
              .${this.data
      .classText} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${this
      .data.transform.md}%, 0, 0); } }
            @media (min-width: 1200px) {
              .${this.data
      .classText} > .ngxcarousel > .ngxcarousel-inner > .ngxcarousel-items { transform: translate3d(-${this
      .data.transform.lg}%, 0, 0); } }`;
  }


  private setNonResponsiveTransforms(slide: number): void {
    this.data.transform.all = this.userData.grid.all * slide;
  }


  private setResponsiveTransforms(slide: number): void {
    this.data.transform.xs = 100 / this.userData.grid.xs * slide;
    this.data.transform.sm = 100 / this.userData.grid.sm * slide;
    this.data.transform.md = 100 / this.userData.grid.md * slide;
    this.data.transform.lg = 100 / this.userData.grid.lg * slide;
  }


  private triggerCarouselToLoadItems(): void {
    if (typeof this.userData?.load === 'number') {
      if ((this.items ?? [ ]).length - this.data.load <= this.data.currentSlide + this.data.items) {
        this.carouselLoad.emit(this.data.currentSlide);
      }
    }
  }


  /* generate Class for each carousel to set specific style */
  private generateID(): string {
    let text: string = '';
    const possible: string =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i: number = 0; i < 6; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return `ngxcarousel${text}`;
  }


  /* handle the auto slide */
  private carouselInterval(): void {
    if (typeof this.userData?.interval === 'number' && this.data.loop) {
      this.renderer.listen(this.carouselMain, 'touchstart', (): void => {
        this.carouselIntervalEvent(1);
      });

      this.renderer.listen(this.carouselMain, 'touchend', (): void => {
        this.carouselIntervalEvent(0);
      });

      this.renderer.listen(this.carouselMain, 'mouseenter', (): void => {
        this.carouselIntervalEvent(1);
      });

      this.renderer.listen(this.carouselMain, 'mouseleave', (): void => {
        this.carouselIntervalEvent(0);
      });

      this.renderer.listen('window', 'scroll', (): void => {
        clearTimeout(this.onScrolling);
        this.onScrolling = setTimeout((): void => {
          this.onWindowScrolling();
        }, 600);
      });

      this.carouselInt = setInterval((): void => {
        if (!this.pauseCarousel) {
          this.carouselScrollOne(1);
        }
      }, this.userData.interval);
    }
  }


  /* pause interval for specific time */
  private carouselIntervalEvent(ev: number): void {
    this.evtValue = ev;
    if (this.evtValue === 0) {
      clearTimeout(this.pauseInterval);
      this.pauseInterval = setTimeout((): void => {
        if (this.evtValue === 0) {
          this.pauseCarousel = false;
        }
      }, this.userData.interval);
    } else {
      this.pauseCarousel = true;
    }
  }


  /* animate the carousel items */
  private carouselAnimator(direction: number, start: number, end: number, speed: number, length: number): void {
    let val: number = length < 5 ? length : 5;
    val = val === 1 ? 3 : val;

    if (direction === 1) {
      for (let i: number = start - 1; i < end; i++) {
        val = val * 2;
        if (this.carouselItems?.[i]) {
          this.setStyle(this.carouselItems[i], 'transform', `translate3d(${val}px, 0, 0)`);
        }
      }
    } else {
      for (let i: number = end - 1; i >= start - 1; i--) {
        val = val * 2;
        if (this.carouselItems?.[i]) {
          this.setStyle(this.carouselItems[i], 'transform', `translate3d(-${val}px, 0, 0)`);
        }
      }
    }
    setTimeout((): void => {
      for (let i: number = 0; i < (this.items ?? [ ]).length; i++) {
        this.setStyle(this.carouselItems?.[i], 'transform', 'translate3d(0, 0, 0)');
      }
    }, speed * .7);
  }


  /* control button for loop */
  private buttonControl(): void {
    if (!this.data.loop || (this.data.isFirst && this.data.isLast)) {
      this.setStyle(
        this.leftBtn,
        'display',
        this.data.isFirst ? 'none' : 'block'
      );
      this.setStyle(
        this.rightBtn,
        'display',
        this.data.isLast ? 'none' : 'block'
      );
    } else {
      this.setStyle(this.leftBtn, 'display', 'block');
      this.setStyle(this.rightBtn, 'display', 'block');
    }
  }


  private setStyle(el: Element | undefined, prop: string, val: string): void {
    this.renderer.setStyle(el, prop, val);
  }
}
