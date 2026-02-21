#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <RNCarPlay.h>

extern "C" void __cxa_increment_exception_refcount(void* thrown_exception) {
// Minimal no-op implementation
}


@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"trakk";
  self.initialProps = @{};

  BOOL result = [super application:application didFinishLaunchingWithOptions:launchOptions];

  NSLog(@"[trakk] didFinishLaunching – window=%@, rootVC=%@", self.window, self.window.rootViewController);
  return result;
}

#pragma mark - Phone Scene Delegate

- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)connectionOptions
{
  NSLog(@"[trakk] scene:willConnectToSession role=%@ self=%p", session.role, self);

  if ([scene isKindOfClass:[UIWindowScene class]]) {
    UIWindowScene *windowScene = (UIWindowScene *)scene;

    // The window lives on the AppDelegate *singleton*, not on this scene-delegate instance
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    UIWindow *window = appDelegate.window;

    NSLog(@"[trakk] singleton=%p  singleton.window=%@", appDelegate, window);

    if (window) {
      window.windowScene = windowScene;
      [window makeKeyAndVisible];
    }
  }
}

#pragma mark - CarPlay Scene Delegate

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
  didConnectInterfaceController:(CPInterfaceController *)interfaceController
                       toWindow:(CPWindow *)window
{
  NSLog(@"[trakk] CarPlay didConnect (with window) – self=%p interfaceController=%@", self, interfaceController);
  [RNCarPlay connectWithInterfaceController:interfaceController window:window];
}

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
  didConnectInterfaceController:(CPInterfaceController *)interfaceController
{
  NSLog(@"[trakk] CarPlay didConnect (no window) – self=%p interfaceController=%@", self, interfaceController);
  [RNCarPlay connectWithInterfaceController:interfaceController window:templateApplicationScene.carWindow];
}

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
  didDisconnectInterfaceController:(CPInterfaceController *)interfaceController
                        fromWindow:(CPWindow *)window
{
  NSLog(@"[trakk] CarPlay didDisconnect (with window)");
  [RNCarPlay disconnect];
}

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
  didDisconnectInterfaceController:(CPInterfaceController *)interfaceController
{
  NSLog(@"[trakk] CarPlay didDisconnect (no window)");
  [RNCarPlay disconnect];
}

#pragma mark - React Native

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (BOOL)concurrentRootEnabled
{
  return true;
}

#pragma mark - Scene Configuration

- (UISceneConfiguration *)application:(UIApplication *)application
  configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession
                                options:(UISceneConnectionOptions *)options
{
  NSLog(@"[trakk] configurationForConnectingSceneSession role=%@", connectingSceneSession.role);

  if ([connectingSceneSession.role isEqualToString:CPTemplateApplicationSceneSessionRoleApplication]) {
    UISceneConfiguration *config = [[UISceneConfiguration alloc]
      initWithName:@"CarPlay"
      sessionRole:connectingSceneSession.role];
    config.delegateClass = [AppDelegate class];
    return config;
  }

  UISceneConfiguration *config = [[UISceneConfiguration alloc]
    initWithName:@"Default Configuration"
    sessionRole:connectingSceneSession.role];
  config.delegateClass = [AppDelegate class];
  return config;
}

@end
