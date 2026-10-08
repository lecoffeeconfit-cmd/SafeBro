Pod::Spec.new do |s|
  s.name = 'SentinelMulticam'
  s.version = '0.1.0'
  s.summary = 'SafeBro camera, speech, and on-device intelligence modules'
  s.description = 'Local iOS capture and processing modules for SafeBro.'
  s.license = { :type => 'Proprietary' }
  s.author = 'SafeBro'
  s.homepage = 'https://github.com/lecoffeeconfit-cmd/SafeBro'
  s.source = { :git => 'https://github.com/lecoffeeconfit-cmd/SafeBro.git' }
  s.platform = :ios, '13.4'
  s.swift_version = '5.0'
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '*.swift'
end
