import { Composition } from 'remotion'
import { Demo, FPS, TOTAL } from './Demo'

export const RemotionRoot: React.FC = () => (
  <Composition id="Demo" component={Demo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
)
