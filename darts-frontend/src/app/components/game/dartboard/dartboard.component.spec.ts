import { ElementRef } from '@angular/core';
import { DartboardComponent } from './dartboard.component';

describe('DartboardComponent', () => {
  let component: DartboardComponent;
  let dartboard: SVGSVGElement;

  beforeEach(() => {
    component = new DartboardComponent();
    dartboard = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    component.dartboardRef = new ElementRef(dartboard);
    component.ngAfterViewInit();
  });

  it('renders every scoring ring and both bulls', () => {
    expect(dartboard.querySelectorAll('path.dart-section').length).toBe(80);
    expect(dartboard.querySelectorAll('circle.dart-section').length).toBe(3);
  });

  it('emits the configured score and exact board position', () => {
    spyOn(component.throwRecorded, 'emit');
    spyOn(dartboard, 'getScreenCTM').and.returnValue(
      new DOMMatrix([2, 0, 0, 2, 20, 40]),
    );
    const tripleTwenty = dartboard.querySelector<SVGPathElement>(
      'path[data-base="20"][data-multiplier="3"]',
    );

    tripleTwenty!.dispatchEvent(
      new MouseEvent('click', { clientX: 320, clientY: 240 }),
    );

    expect(component.throwRecorded.emit).toHaveBeenCalledWith({
      score: 60,
      x: 150,
      y: 100,
    });
  });

  it('renders supplied hitmarkers above the board', () => {
    component.hitMarkers = [
      { x: 125, y: 250 },
      { x: 500, y: 500 },
    ];

    const markers = dartboard.querySelectorAll<SVGGElement>('g.hit-marker');
    expect(markers.length).toBe(2);
    expect(markers[0].getAttribute('transform')).toBe('translate(125 250)');
    expect(markers[1].getAttribute('transform')).toBe('translate(500 500)');
    expect(markers[0].querySelectorAll('line').length).toBe(4);
    expect(markers[0].querySelector('circle.hit-marker-center')).not.toBeNull();
    expect(markers[0].parentElement?.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not emit while disabled', () => {
    spyOn(component.throwRecorded, 'emit');
    component.isClickable = false;
    const scoringSegment = dartboard.querySelector<SVGPathElement>('path');

    scoringSegment!.dispatchEvent(new MouseEvent('click'));

    expect(component.throwRecorded.emit).not.toHaveBeenCalled();
    expect(dartboard.getAttribute('aria-disabled')).toBe('true');
  });
});
