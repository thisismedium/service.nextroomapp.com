pkg_maker = /Developer/Applications/Utilities/PackageMaker.app/Contents/MacOS/PackageMaker
pkg_root = build/dstroot
lib_path = $(pkg_root)/Library/Nextroom
dep_path = $(lib_path)/lib/python2.5
clean: 
	rm -Rf $(lib_path)
	rm -Rf nextroom.pkg
package:  clean
	@echo "Creating package tree in build"
	mkdir -p    $(lib_path)
	cp -R start-nextroom.sh $(lib_path)
	cp -R nextroom.db $(lib_path)
	cp -R nextroom $(lib_path)
	cp -R wsgi     $(lib_path)	
	cp -R lib      $(lib_path)
	(cd $(dep_path) && tar xf ../../../../../../deps/CherryPy-3.1.2.tar.gz)
	(cd $(dep_path) && tar xf ../../../../../../deps/Django-1.1.1.tar.gz)
	(cd $(dep_path) && tar xf ../../../../../../deps/simplejson-2.1.1.tar.gz)
	chown -R root:staff $(pkg_root)
	$(pkg_maker) --root $(pkg_root) --id com.thisismedium.nextroom -o nextroom.pkg --title "NextRoom" -b
