import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const BOARD_SIZE = 1000;
const SECTION_COUNT = 20;
const SECTION_ANGLE = 360 / SECTION_COUNT;
const BOARD_VALUES = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

const COLORS = {
  background: '#000',
  singleEven: '#d1c69b',
  singleOdd: '#000',
  multiplierEven: '#006917',
  multiplierOdd: '#a60008',
};

type RingDefinition = {
  innerRadius: number;
  outerRadius: number;
  multiplier: 1 | 2 | 3;
  evenColor: string;
  oddColor: string;
};

const OUTER_RADIUS = BOARD_SIZE / 2;
const RADII = {
  doubleInner: OUTER_RADIUS * 0.9,
  doubleOuter: OUTER_RADIUS,
  tripleInner: OUTER_RADIUS * 0.5,
  tripleOuter: OUTER_RADIUS * 0.6,
  singleOuterInner: OUTER_RADIUS * 0.6,
  singleOuterOuter: OUTER_RADIUS * 0.9,
  innerBull: OUTER_RADIUS * 0.065,
  outerBull: OUTER_RADIUS * 0.12,
  background: OUTER_RADIUS * 1.2,
  numbers: OUTER_RADIUS * 1.1,
};

const RINGS: RingDefinition[] = [
  {
    innerRadius: RADII.doubleInner,
    outerRadius: RADII.doubleOuter,
    multiplier: 2,
    evenColor: COLORS.multiplierEven,
    oddColor: COLORS.multiplierOdd,
  },
  {
    innerRadius: RADII.singleOuterInner,
    outerRadius: RADII.singleOuterOuter,
    multiplier: 1,
    evenColor: COLORS.singleEven,
    oddColor: COLORS.singleOdd,
  },
  {
    innerRadius: RADII.tripleInner,
    outerRadius: RADII.tripleOuter,
    multiplier: 3,
    evenColor: COLORS.multiplierEven,
    oddColor: COLORS.multiplierOdd,
  },
  {
    innerRadius: RADII.outerBull,
    outerRadius: RADII.tripleInner,
    multiplier: 1,
    evenColor: COLORS.singleEven,
    oddColor: COLORS.singleOdd,
  },
];

export interface DartboardPoint {
  x: number;
  y: number;
}

export interface DartboardThrow extends DartboardPoint {
  score: number;
}

@Component({
  selector: 'app-dartboard',
  imports: [],
  templateUrl: './dartboard.component.html',
  styleUrl: './dartboard.component.scss',
})
export class DartboardComponent implements AfterViewInit {
  private clickable = true;
  private markerPositions: readonly DartboardPoint[] = [];

  @Input()
  set isClickable(value: boolean) {
    this.clickable = value ?? true;
    this.applyInteractivityState();
  }
  get isClickable(): boolean {
    return this.clickable;
  }

  @Input()
  set hitMarkers(value: readonly DartboardPoint[]) {
    this.markerPositions = value ?? [];
    this.renderHitMarkers();
  }
  get hitMarkers(): readonly DartboardPoint[] {
    return this.markerPositions;
  }

  @Output() throwRecorded = new EventEmitter<DartboardThrow>();

  @ViewChild('dartboard', { static: true })
  dartboardRef!: ElementRef<SVGSVGElement>;

  ngAfterViewInit(): void {
    this.renderDartboard();
    this.applyInteractivityState();
  }

  private applyInteractivityState(): void {
    const dartboard = this.dartboardRef?.nativeElement;
    if (!dartboard) return;

    dartboard.setAttribute('data-clickable', String(this.isClickable));
    dartboard.setAttribute('aria-disabled', String(!this.isClickable));
  }

  private renderDartboard(): void {
    const dartboard = this.dartboardRef.nativeElement;
    dartboard.replaceChildren();

    const padding = BOARD_SIZE * 0.11;
    dartboard.setAttribute(
      'viewBox',
      `${-padding} ${-padding} ${BOARD_SIZE + padding * 2} ${BOARD_SIZE + padding * 2}`,
    );
    dartboard.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    dartboard.appendChild(this.createDefinitions());

    const center = BOARD_SIZE / 2;
    const background = this.createSvgElement('circle');
    background.setAttribute('cx', String(center));
    background.setAttribute('cy', String(center));
    background.setAttribute('r', String(RADII.background));
    background.setAttribute('fill', COLORS.background);
    this.configureScoringElement(background, 0, 1);
    dartboard.appendChild(background);

    for (const ring of RINGS) {
      for (let index = 0; index < SECTION_COUNT; index++) {
        const startAngle = (index + 0.5) * SECTION_ANGLE;
        const endAngle = (index + 1.5) * SECTION_ANGLE;
        const value = BOARD_VALUES[(index + 1) % SECTION_COUNT];
        const fill = index % 2 === 0 ? ring.evenColor : ring.oddColor;
        const path = this.createWedgePath(
          center,
          center,
          ring.innerRadius,
          ring.outerRadius,
          startAngle,
          endAngle,
        );
        dartboard.appendChild(
          this.createWedge(path, fill, value, ring.multiplier),
        );
      }
    }

    dartboard.appendChild(
      this.createCircle(
        center,
        center,
        RADII.outerBull,
        COLORS.multiplierEven,
        25,
      ),
    );
    dartboard.appendChild(
      this.createCircle(
        center,
        center,
        RADII.innerBull,
        COLORS.multiplierOdd,
        50,
      ),
    );

    for (let index = 0; index < SECTION_COUNT; index++) {
      const angle = (index * SECTION_ANGLE * Math.PI) / 180;
      const label = this.createSvgElement('text');
      label.setAttribute('x', String(center + Math.sin(angle) * RADII.numbers));
      label.setAttribute('y', String(center - Math.cos(angle) * RADII.numbers));
      label.setAttribute('font-size', String(0.065 * BOARD_SIZE));
      label.setAttribute('class', 'value-label');
      label.textContent = String(BOARD_VALUES[index]);
      label.addEventListener('click', (event) => this.emitScore(0, event));
      dartboard.appendChild(label);
    }

    this.renderHitMarkers();
  }

  private createDefinitions(): SVGDefsElement {
    const definitions = this.createSvgElement('defs');
    const filter = this.createSvgElement('filter');
    filter.setAttribute('id', 'dartGlow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const blur = this.createSvgElement('feGaussianBlur');
    blur.setAttribute('stdDeviation', '6');
    blur.setAttribute('result', 'blur');

    const merge = this.createSvgElement('feMerge');
    const blurredNode = this.createSvgElement('feMergeNode');
    blurredNode.setAttribute('in', 'blur');
    const sourceNode = this.createSvgElement('feMergeNode');
    sourceNode.setAttribute('in', 'SourceGraphic');
    merge.append(blurredNode, sourceNode);
    filter.append(blur, merge);

    const style = this.createSvgElement('style');
    style.textContent = `
      .dart-section { stroke: #000; stroke-width: 1; }
      svg[data-clickable="true"] .dart-section:hover {
        cursor: crosshair;
        opacity: .85;
        filter: url(#dartGlow);
      }
      .value-label {
        fill: #d6d6d6;
        font-weight: 700;
        text-anchor: middle;
        dominant-baseline: middle;
      }
      svg[data-clickable="true"] .value-label { cursor: crosshair; }
      svg[data-clickable="false"] .value-label { cursor: not-allowed; }
      .hit-marker {
        pointer-events: none;
      }
      .hit-marker-outline {
        stroke: #111;
        stroke-width: 10;
        stroke-linecap: round;
      }
      .hit-marker-cross {
        stroke: #fff;
        stroke-width: 5;
        stroke-linecap: round;
      }
      .hit-marker-center {
        fill: #ffeb00;
        stroke: #111;
        stroke-width: 3;
      }
    `;

    definitions.append(filter, style);
    return definitions;
  }

  private createWedgePath(
    centerX: number,
    centerY: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number,
  ): string {
    const startRadians = ((startAngle - 90) * Math.PI) / 180;
    const endRadians = ((endAngle - 90) * Math.PI) / 180;
    const outerStartX = centerX + outerRadius * Math.cos(startRadians);
    const outerStartY = centerY + outerRadius * Math.sin(startRadians);
    const outerEndX = centerX + outerRadius * Math.cos(endRadians);
    const outerEndY = centerY + outerRadius * Math.sin(endRadians);
    const innerEndX = centerX + innerRadius * Math.cos(endRadians);
    const innerEndY = centerY + innerRadius * Math.sin(endRadians);
    const innerStartX = centerX + innerRadius * Math.cos(startRadians);
    const innerStartY = centerY + innerRadius * Math.sin(startRadians);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${outerStartX} ${outerStartY}
            A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}
            L ${innerEndX} ${innerEndY}
            A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}
            Z`;
  }

  private createWedge(
    path: string,
    fill: string,
    baseValue: number,
    multiplier: 1 | 2 | 3,
  ): SVGPathElement {
    const wedge = this.createSvgElement('path');
    wedge.setAttribute('d', path);
    wedge.setAttribute('fill', fill);
    return this.configureScoringElement(wedge, baseValue, multiplier);
  }

  private createCircle(
    centerX: number,
    centerY: number,
    radius: number,
    fill: string,
    score: number,
  ): SVGCircleElement {
    const circle = this.createSvgElement('circle');
    circle.setAttribute('cx', String(centerX));
    circle.setAttribute('cy', String(centerY));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', fill);
    return this.configureScoringElement(circle, score, 1);
  }

  private configureScoringElement<T extends SVGElement>(
    element: T,
    baseValue: number,
    multiplier: number,
  ): T {
    element.classList.add('dart-section');
    element.setAttribute('data-base', String(baseValue));
    element.setAttribute('data-multiplier', String(multiplier));
    element.addEventListener('click', (event) =>
      this.emitScore(baseValue * multiplier, event),
    );
    return element;
  }

  private emitScore(score: number, event: MouseEvent): void {
    if (!this.isClickable) return;

    this.throwRecorded.emit({
      score,
      ...this.toSvgPoint(event),
    });
  }

  private toSvgPoint(event: MouseEvent): DartboardPoint {
    const dartboard = this.dartboardRef.nativeElement;
    const screenMatrix = dartboard.getScreenCTM?.();
    if (screenMatrix) {
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        screenMatrix.inverse(),
      );
      return { x: point.x, y: point.y };
    }

    const bounds = dartboard.getBoundingClientRect();
    const viewBox = dartboard.viewBox.baseVal;
    if (bounds.width > 0 && bounds.height > 0) {
      return {
        x:
          viewBox.x +
          ((event.clientX - bounds.left) / bounds.width) * viewBox.width,
        y:
          viewBox.y +
          ((event.clientY - bounds.top) / bounds.height) * viewBox.height,
      };
    }

    return { x: event.offsetX, y: event.offsetY };
  }

  private renderHitMarkers(): void {
    const dartboard = this.dartboardRef?.nativeElement;
    if (!dartboard) return;

    let markerLayer = dartboard.querySelector<SVGGElement>(
      '[data-hit-marker-layer]',
    );
    if (!markerLayer) {
      markerLayer = this.createSvgElement('g');
      markerLayer.setAttribute('data-hit-marker-layer', '');
      markerLayer.setAttribute('aria-hidden', 'true');
      dartboard.appendChild(markerLayer);
    }

    markerLayer.replaceChildren(
      ...this.markerPositions.map(({ x, y }) => {
        const marker = this.createSvgElement('g');
        marker.classList.add('hit-marker');
        marker.setAttribute('transform', `translate(${x} ${y})`);

        const armLength = BOARD_SIZE * 0.025;
        marker.append(
          this.createMarkerLine(-armLength, 0, armLength, 0, true),
          this.createMarkerLine(0, -armLength, 0, armLength, true),
          this.createMarkerLine(-armLength, 0, armLength, 0),
          this.createMarkerLine(0, -armLength, 0, armLength),
        );

        const center = this.createSvgElement('circle');
        center.classList.add('hit-marker-center');
        center.setAttribute('r', String(BOARD_SIZE * 0.008));
        marker.appendChild(center);
        return marker;
      }),
    );
  }

  private createMarkerLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    outline = false,
  ): SVGLineElement {
    const line = this.createSvgElement('line');
    line.classList.add(outline ? 'hit-marker-outline' : 'hit-marker-cross');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    return line;
  }

  private createSvgElement<K extends keyof SVGElementTagNameMap>(
    tagName: K,
  ): SVGElementTagNameMap[K] {
    return document.createElementNS(SVG_NAMESPACE, tagName);
  }
}
