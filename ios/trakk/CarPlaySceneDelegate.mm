#import "CarPlaySceneDelegate.h"
#import <RNCarPlay.h>

@implementation CarPlaySceneDelegate

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
  didConnectInterfaceController:(CPInterfaceController *)interfaceController
                       toWindow:(CPWindow *)window
{
  [RNCarPlay connectWithInterfaceController:interfaceController window:window];
}

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
  didConnectInterfaceController:(CPInterfaceController *)interfaceController
{
  [RNCarPlay connectWithInterfaceController:interfaceController window:templateApplicationScene.carWindow];
}

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
  didDisconnectInterfaceController:(CPInterfaceController *)interfaceController
                        fromWindow:(CPWindow *)window
{
  [RNCarPlay disconnect];
}

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
  didDisconnectInterfaceController:(CPInterfaceController *)interfaceController
{
  [RNCarPlay disconnect];
}

@end
