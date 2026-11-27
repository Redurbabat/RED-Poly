Pod::Spec.new do |s|
  s.name = 'RedIdentity'
  s.version = '0.1.0'
  s.summary = 'Private RED identity bridge'
  s.description = 'Local native RED identity SDK bridge'
  s.license = { :type => 'Internal pilot; review before release' }
  s.author = 'RED ecosystem'
  s.homepage = 'https://github.com/Redurbabat/RED-Poly'
  s.platforms = { :ios => '15.1' }
  s.source = { :git => 'https://github.com/Redurbabat/RED-Poly.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.swift_version = '5.9'
end
